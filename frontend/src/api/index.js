import api from './axios';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getMe: () => api.get('/auth/me'),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userAPI = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateProfile: (data) => api.patch('/users/me', data),
  uploadAvatar: (formData) => api.patch('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  searchUsers: (query) => api.get(`/users/search?q=${query}`),
};

// ─── Workspaces ──────────────────────────────────────────────────────────────
export const workspaceAPI = {
  getAll: () => api.get('/workspaces'),
  getOne: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  update: (id, data) => api.patch(`/workspaces/${id}`, data),
  delete: (id) => api.delete(`/workspaces/${id}`),
  invite: (id, data) => api.post(`/workspaces/${id}/invite`, data),
  acceptInvite: (token) => api.post('/workspaces/accept-invite', { token }),
  removeMember: (id, userId) => api.delete(`/workspaces/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.patch(`/workspaces/${id}/members/${userId}`, { role }),
};

// ─── Projects ────────────────────────────────────────────────────────────────
export const projectAPI = {
  getAll: (workspaceId) => api.get(`/projects?workspace=${workspaceId}`),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getMembers: (id) => api.get(`/projects/${id}/members`),
  addMember: (id, userId) => api.post(`/projects/${id}/members`, { userId }),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────
export const taskAPI = {
  getAll: (projectId) => api.get(`/tasks?project=${projectId}`),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  updateDependencies: (id, blockedBy) => api.patch(`/tasks/${id}/dependencies`, { blockedBy }),
  reorder: (data) => api.patch('/tasks/reorder', data),
  addComment: (id, content) => api.post(`/tasks/${id}/comments`, { content }),
  deleteComment: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
  attachFile: (id, formData) => api.post(`/tasks/${id}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMyTasks: () => api.get('/tasks/my-tasks'),
};

// ─── Files ───────────────────────────────────────────────────────────────────
export const fileAPI = {
  getProjectFiles: (projectId) => api.get(`/files?project=${projectId}`),
  upload: (projectId, formData) => api.post(`/files?project=${projectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/files/${id}`),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ─── AI ──────────────────────────────────────────────────────────────────────
export const aiAPI = {
  estimateTask: (data) => api.post('/ai/estimate', data),
  breakdownTask: (data) => api.post('/ai/breakdown', data),
  createFromNLP: (data) => api.post('/ai/nlp-create', data),
  suggestAssignee: (data) => api.post('/ai/suggest-assignee', data),
  projectHealthScore: (projectId) => api.get(`/ai/health/${projectId}`),
  chat: (messages) => api.post('/ai/chat', { messages }),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatAPI = {
  createChannel: (data) => api.post('/chat/channel', data),
  getChannels: (workspaceId) => api.get(`/chat/channel/${workspaceId}`),
  sendMessage: (data) => api.post('/chat/message', data),
  getMessages: (params) => api.get('/chat/messages', { params }),
};

// ─── Wiki ─────────────────────────────────────────────────────────────────────
export const wikiAPI = {
  list: (projectId, taskId) => api.get(`/wiki?projectId=${projectId}${taskId ? `&taskId=${taskId}` : ''}`),
  getOne: (id) => api.get(`/wiki/${id}`),
  create: (data) => api.post('/wiki', data),
  update: (id, data) => api.patch(`/wiki/${id}`, data),
  delete: (id) => api.delete(`/wiki/${id}`),
};

// ─── Sprints ──────────────────────────────────────────────────────────────────
export const sprintAPI = {
  list: (projectId) => api.get(`/sprints?projectId=${projectId}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.patch(`/sprints/${id}`, data),
  delete: (id) => api.delete(`/sprints/${id}`),
};

// ─── Meetings ─────────────────────────────────────────────────────────────
export const meetingAPI = {
  list: (workspaceId, start, end) => api.get('/meetings', { params: { workspaceId, start, end } }),
  getOne: (id) => api.get(`/meetings/${id}`),
  create: (data) => api.post('/meetings', data),
};
