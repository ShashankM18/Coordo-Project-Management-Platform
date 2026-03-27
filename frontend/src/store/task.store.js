import { create } from 'zustand';
import { taskAPI } from '@api/index';

// Column order for Kanban
export const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
  { id: 'in_review', label: 'In Review', color: 'bg-amber-50' },
  { id: 'done', label: 'Done', color: 'bg-emerald-50' },
];

export const useTaskStore = create((set, get) => ({
  tasks: [],
  selectedTask: null,
  isLoading: false,

  // ── Getters ───────────────────────────────────────────────────────────────
  getTasksByStatus: (status) =>
    get().tasks.filter((t) => t.status === status),

  getTasksByColumn: () =>
    COLUMNS.reduce((acc, col) => {
      acc[col.id] = get().tasks.filter((t) => t.status === col.id);
      return acc;
    }, {}),

  // ── CRUD ──────────────────────────────────────────────────────────────────
  fetchTasks: async (projectId) => {
    set({ isLoading: true });
    try {
      const data = await taskAPI.getAll(projectId);
      set({ tasks: data.tasks, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createTask: async (data) => {
    const result = await taskAPI.create(data);
    set((state) => ({
      tasks: state.tasks.some((t) => t._id === result.task._id)
        ? state.tasks.map((t) => (t._id === result.task._id ? result.task : t))
        : [result.task, ...state.tasks],
    }));
    return result.task;
  },

  updateTask: async (id, data) => {
    const result = await taskAPI.update(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === id ? result.task : t)),
      selectedTask: state.selectedTask?._id === id ? result.task : state.selectedTask,
    }));
    return result.task;
  },

  updateTaskStatus: (id, status) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === id ? { ...t, status } : t)),
    }));
    taskAPI.updateStatus(id, status).catch(() => {
      // Revert on error — refetch
      get().fetchTasks();
    });
  },

  deleteTask: async (id) => {
    await taskAPI.delete(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t._id !== id),
      selectedTask: state.selectedTask?._id === id ? null : state.selectedTask,
    }));
  },

  addComment: async (taskId, content) => {
    const result = await taskAPI.addComment(taskId, content);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t._id === taskId ? { ...t, comments: result.task.comments } : t
      ),
      selectedTask:
        state.selectedTask?._id === taskId
          ? { ...state.selectedTask, comments: result.task.comments }
          : state.selectedTask,
    }));
  },

  updateDependencies: async (taskId, blockedBy) => {
    const result = await taskAPI.updateDependencies(taskId, blockedBy);
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? result.task : t)),
      selectedTask: state.selectedTask?._id === taskId ? result.task : state.selectedTask,
    }));
    return result.task;
  },

  // ── Socket sync ───────────────────────────────────────────────────────────
  syncTaskUpdate: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === task._id ? task : t)),
    })),

  syncNewTask: (task) =>
    set((state) => ({
      tasks: state.tasks.some((t) => t._id === task._id)
        ? state.tasks
        : [task, ...state.tasks],
    })),

  syncDeleteTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t._id !== taskId) })),

  setSelectedTask: (task) => set({ selectedTask: task }),
}));
