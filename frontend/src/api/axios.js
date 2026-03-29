import axios from 'axios';
import { BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

const getPersistedAuth = () => {
  try {
    const raw = localStorage.getItem('coordo-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const auth = getPersistedAuth();
    const token = auth?.state?.token || auth?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token expiry
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const auth = getPersistedAuth();
        const refreshToken = auth?.state?.refreshToken || auth?.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        // Update persisted auth to keep tokens in sync with store on reload
        const current = getPersistedAuth() || {};
        const next = {
          ...(current || {}),
          state: {
            ...(current?.state || {}),
            token: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
          },
        };
        try {
          localStorage.setItem('coordo-auth', JSON.stringify(next));
        } catch { /* ignore storage errors */ }
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Clear persisted auth on failure and redirect to login
        try { localStorage.removeItem('coordo-auth'); } catch { /* ignore */ }
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Normalize error message
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;
