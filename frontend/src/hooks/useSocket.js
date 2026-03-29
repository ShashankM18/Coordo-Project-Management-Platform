import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@store/auth.store';
import { useTaskStore } from '@store/task.store';
import { useNotificationStore } from '@store/notification.store';
import toast from 'react-hot-toast';
import { SOCKET_URL } from '../config/api';

let socketInstance = null;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }

    socketRef.current = socketInstance;
    const socket = socketInstance;

    // Task real-time sync
    socket.on('task:updated', (task) => useTaskStore.getState().syncTaskUpdate(task));
    socket.on('task:created', (task) => useTaskStore.getState().syncNewTask(task));
    socket.on('task:deleted', ({ taskId }) => useTaskStore.getState().syncDeleteTask(taskId));
    socket.on('tasks:reordered', () => {}); // stores handle optimistic, no-op here

    // Live notifications
    socket.on('notification:new', (notif) => {
      useNotificationStore.getState().addNew(notif);
      toast(notif.message || notif.title, {
        icon: '🔔',
        duration: 4000,
        style: { fontSize: '13px' },
      });
    });

    return () => {
      socket.off('task:updated');
      socket.off('task:created');
      socket.off('task:deleted');
      socket.off('tasks:reordered');
      socket.off('notification:new');
    };
  }, [isAuthenticated, token]);

  const joinProject = (projectId) => socketRef.current?.emit('join:project', projectId);
  const leaveProject = (projectId) => socketRef.current?.emit('leave:project', projectId);
  const joinWorkspace = (workspaceId) => socketRef.current?.emit('join:workspace', workspaceId);
  const joinChannel = (channelId) => socketRef.current?.emit('joinChannel', channelId);
  const joinDM = (otherUserId) => socketRef.current?.emit('joinDM', { userId: otherUserId });

  return {
    socket: socketRef.current,
    joinProject,
    leaveProject,
    joinWorkspace,
    joinChannel,
    joinDM,
  };
};

export const disconnectSocket = () => {
  socketInstance?.disconnect();
  socketInstance = null;
};
