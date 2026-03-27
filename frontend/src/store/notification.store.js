import { create } from 'zustand';
import { notificationAPI } from '@api/index';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const data = await notificationAPI.getAll();
      set({ notifications: data.notifications, unreadCount: data.unreadCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    await notificationAPI.markRead(id);
    set(state => ({
      notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationAPI.markAllRead();
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  delete: async (id) => {
    const n = get().notifications.find(n => n._id === id);
    await notificationAPI.delete(id);
    set(state => ({
      notifications: state.notifications.filter(n => n._id !== id),
      unreadCount: n && !n.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));
  },

  addNew: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
