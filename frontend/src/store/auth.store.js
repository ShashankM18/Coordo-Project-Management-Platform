import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@api/index';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ── Actions ──────────────────────────────────────────────────────────
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authAPI.login(credentials);
          set({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return data;
        } catch (err) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authAPI.register(userData);
          set({
            user: data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return data;
        } catch (err) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try { await authAPI.logout(); } catch { /* ignore */ }
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'coordo-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
