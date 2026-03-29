const envUrl = import.meta.env.VITE_API_BASE_URL;

// Axios base URL (endpoints sit under /api)
export const BASE_URL = envUrl ? `${envUrl.replace(/\/+$/, '')}/api` : '/api';

// Socket.io URL (sits at root)
export const SOCKET_URL = envUrl ? envUrl.replace(/\/+$/, '') : '/';
