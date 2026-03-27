import { create } from 'zustand';
import { chatAPI } from '@api/index';

const defaultChatState = {
  channels: [],
  currentChannel: null,
  currentDMUser: null,
  messages: [],
};

const getId = (value) => (typeof value === 'object' && value !== null ? value._id : value);

export const useChatStore = create((set, get) => ({
  ...defaultChatState,
  isOpen: false,

  setIsOpen: (isOpen) => set({ isOpen }),
  setCurrentChannel: (channel) => set({ currentChannel: channel, currentDMUser: null, messages: [] }),
  setCurrentDMUser: (user) => set({ currentDMUser: user, currentChannel: null, messages: [] }),
  resetChatContext: () => set({ ...defaultChatState }),

  fetchChannels: async (workspaceId) => {
    try {
      const data = await chatAPI.getChannels(workspaceId);
      const channels = data.channels || [];
      const current = get().currentChannel;
      const selected = current
        ? channels.find((c) => c._id === current._id) || channels[0] || null
        : channels.find((c) => c.name === 'general') || channels[0] || null;

      set({
        channels,
        currentChannel: get().currentDMUser ? null : selected,
      });
      return channels;
    } catch (err) {
      console.error('Failed to fetch channels:', err);
      return [];
    }
  },

  createChannel: async (workspaceId, name) => {
    try {
      const data = await chatAPI.createChannel({ workspaceId, name });
      await get().fetchChannels(workspaceId);
      return data.channel;
    } catch (err) {
      console.error('Failed to create channel:', err);
      throw err;
    }
  },

  fetchMessages: async (workspaceId) => {
    try {
      const { currentChannel, currentDMUser } = get();
      if (!currentChannel && !currentDMUser) {
        set({ messages: [] });
        return;
      }

      const params = {
        workspaceId,
        chatType: currentChannel ? 'channel' : 'direct',
      };
      if (currentChannel) params.channelId = currentChannel._id;
      if (currentDMUser) params.participantId = currentDMUser._id;

      const data = await chatAPI.getMessages(params);
      set({ messages: data.messages || [] });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      set({ messages: [] });
    }
  },

  sendMessage: async (workspaceId, content) => {
    try {
      const { currentChannel, currentDMUser } = get();
      if (!currentChannel && !currentDMUser) return null;

      const payload = {
        workspaceId,
        content,
        chatType: currentChannel ? 'channel' : 'direct',
      };
      if (currentChannel) payload.channelId = currentChannel._id;
      if (currentDMUser) payload.recipientId = currentDMUser._id;

      const data = await chatAPI.sendMessage(payload);
      return data.message;
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  },

  addMessage: (msg) => {
    set((state) => {
      const inCurrentChannel = state.currentChannel
        && msg.chatType === 'channel'
        && String(getId(msg.channelId)) === String(state.currentChannel._id);

      const inCurrentDM = state.currentDMUser
        && msg.chatType === 'direct'
        && Array.isArray(msg.participants)
        && msg.participants.map((p) => String(getId(p))).includes(String(state.currentDMUser._id));

      if ((inCurrentChannel || inCurrentDM) && !state.messages.some((m) => m._id === msg._id)) {
        return { messages: [...state.messages, msg] };
      }
      return state;
    });
  },
}));
