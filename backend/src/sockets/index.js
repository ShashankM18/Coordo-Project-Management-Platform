import jwt from 'jsonwebtoken';
import Message from '../models/Message.model.js';
import Workspace from '../models/Workspace.model.js';
import Channel from '../models/Channel.model.js';
import { buildDMRoomId, getSortedParticipants } from '../services/chat.service.js';

// Store active socket connections: userId -> Set of socketIds
const userSockets = new Map();

export const initSocketServer = (io) => {

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;
    console.log(`Socket connected: user=${userId}, socket=${socket.id}`);

    // Track user's sockets
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // Join personal room for direct notifications
    socket.join(`user:${userId}`);

    // Join workspace/project rooms
    socket.on('join:workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('joinChannel', (channelId) => {
      if (!channelId) return;
      socket.join(`channel:${channelId}`);
    });

    socket.on('joinDM', ({ userId: otherUserId }) => {
      if (!otherUserId) return;
      socket.join(buildDMRoomId(userId, otherUserId));
    });

    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Typing indicator for comments
    socket.on('typing:start', ({ taskId }) => {
      socket.to(`project:${taskId}`).emit('user:typing', { userId, taskId });
    });

    socket.on('typing:stop', ({ taskId }) => {
      socket.to(`project:${taskId}`).emit('user:stopped-typing', { userId, taskId });
    });

    socket.on('sendMessage', async (payload = {}, ack = () => {}) => {
      try {
        const { content, chatType, workspaceId, channelId, recipientId } = payload;
        if (!workspaceId || !content?.trim() || !chatType) {
          return ack({ ok: false, message: 'workspaceId, chatType and content are required' });
        }

        const ws = await Workspace.findById(workspaceId);
        const senderIsMember = ws && (ws.isMember(userId) || ws.owner.toString() === userId);
        if (!senderIsMember) {
          return ack({ ok: false, message: 'Access denied' });
        }

        const normalizedType = String(chatType).toLowerCase();
        const messageData = {
          sender: userId,
          content: content.trim(),
          chatType: normalizedType,
          workspaceId,
        };

        if (normalizedType === 'channel') {
          const channel = await Channel.findOne({ _id: channelId, workspaceId });
          if (!channel) return ack({ ok: false, message: 'Channel not found' });
          messageData.channelId = channelId;
        }

        if (normalizedType === 'direct') {
          if (!recipientId || recipientId === userId) {
            return ack({ ok: false, message: 'Invalid recipient' });
          }
          const recipientIsMember = ws.isMember(recipientId) || ws.owner.toString() === recipientId;
          if (!recipientIsMember) {
            return ack({ ok: false, message: 'Direct messages are only allowed within the same workspace' });
          }
          messageData.participants = getSortedParticipants(userId, recipientId);
        }

        const message = await Message.create(messageData);
        const populated = await message.populate('sender', 'name avatar');

        if (normalizedType === 'channel') {
          io.to(`channel:${channelId}`).emit('receiveMessage', populated);
          io.to(`workspace:${workspaceId}`).emit('receiveMessage', populated);
        } else {
          const [first, second] = populated.participants;
          io.to(buildDMRoomId(first, second)).emit('receiveMessage', populated);
        }

        ack({ ok: true, message: populated });
      } catch {
        ack({ ok: false, message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket.id);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
      console.log(`Socket disconnected: user=${userId}`);
    });
  });
};

// Emit to a specific user across all their sockets
export const emitToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Emit to all members of a project room
export const emitToProject = (io, projectId, event, data) => {
  io.to(`project:${projectId}`).emit(event, data);
};

// Emit to all members of a workspace room
export const emitToWorkspace = (io, workspaceId, event, data) => {
  io.to(`workspace:${workspaceId}`).emit(event, data);
};
