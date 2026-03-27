import { create } from 'zustand';
import { workspaceAPI, projectAPI } from '@api/index';

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  currentProject: null,
  projects: [],
  isLoading: false,

  // ── Workspaces ────────────────────────────────────────────────────────────
  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const data = await workspaceAPI.getAll();
      const workspaces = data.workspaces || [];
      const current = get().currentWorkspace;
      set({
        workspaces,
        // preserve current if it still exists, otherwise pick first
        currentWorkspace: current
          ? workspaces.find(w => w._id === current._id) || workspaces[0] || null
          : workspaces[0] || null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentWorkspace: (workspace) =>
    set({ currentWorkspace: workspace, projects: [], currentProject: null }),

  fetchWorkspace: async (workspaceId) => {
    try {
      const data = await workspaceAPI.getOne(workspaceId);
      set({ currentWorkspace: data.workspace });
      return data.workspace;
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      throw error;
    }
  },

  createWorkspace: async (data) => {
    const result = await workspaceAPI.create(data);
    const ws = result.workspace;
    set(state => ({ workspaces: [ws, ...state.workspaces] }));
    return ws;
  },

  updateWorkspace: async (id, data) => {
    const result = await workspaceAPI.update(id, data);
    set(state => ({
      workspaces: state.workspaces.map(w => w._id === id ? result.workspace : w),
      currentWorkspace: state.currentWorkspace?._id === id ? result.workspace : state.currentWorkspace,
    }));
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  fetchProjects: async (workspaceId) => {
    set({ isLoading: true });
    try {
      const data = await projectAPI.getAll(workspaceId);
      set({ projects: data.projects || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  createProject: async (data) => {
    const result = await projectAPI.create(data);
    const proj = result.project;
    set(state => ({ projects: [proj, ...state.projects] }));
    return proj;
  },

  updateProject: async (id, data) => {
    const result = await projectAPI.update(id, data);
    set(state => ({
      projects: state.projects.map(p => p._id === id ? result.project : p),
      currentProject: state.currentProject?._id === id ? result.project : state.currentProject,
    }));
    return result.project;
  },

  deleteProject: async (id) => {
    await projectAPI.delete(id);
    set(state => ({
      projects: state.projects.filter(p => p._id !== id),
      currentProject: state.currentProject?._id === id ? null : state.currentProject,
    }));
  },
}));
