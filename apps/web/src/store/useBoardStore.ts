import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, parseJsonError } from '../lib/api';

type BoardStore = {
  error: string | null;
  loading: boolean;
  projects: ProjectSummary[];
  resetBoard: () => void;
  selectedProjectId: string | null;
  selectProject: (projectId: string) => Promise<void>;
  tasks: TaskSummary[];
  loadBoard: () => Promise<void>;
  createProject: (name: string, description?: string, status?: string) => Promise<void>;
  updateProject: (projectId: string, name?: string, description?: string, status?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createTask: (title: string, description?: string, status?: string, priority?: string) => Promise<void>;
  updateTask: (taskId: string, title?: string, description?: string, status?: string, priority?: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskSummary['status']) => Promise<void>;
};


async function loadProjectTasks(projectId: string) {
  const tasksResponse = await apiFetch(`/api/projects/${projectId}/tasks`);

  if (!tasksResponse.ok) {
    throw new Error(await parseJsonError(tasksResponse));
  }

  return (await tasksResponse.json()) as TaskSummary[];
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  error: null,
  loading: false,
  projects: [],
  resetBoard: () => set({ error: null, loading: false, projects: [], selectedProjectId: null, tasks: [] }),
  selectedProjectId: null,
  selectProject: async (projectId) => {
    set({ error: null, loading: true, selectedProjectId: projectId });

    try {
      const tasks = await loadProjectTasks(projectId);
      set({ error: null, loading: false, tasks });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false, tasks: [] });
    }
  },
  tasks: [],
  loadBoard: async () => {
    set({ error: null, loading: true });

    try {
      const projectsResponse = await apiFetch('/api/projects');

      if (!projectsResponse.ok) {
        throw new Error(await parseJsonError(projectsResponse));
      }

      const projects = (await projectsResponse.json()) as ProjectSummary[];
      const { selectedProjectId } = get();
      const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;

      if (!selectedProject) {
        set({ error: null, loading: false, projects: [], selectedProjectId: null, tasks: [] });
        return;
      }

      const tasks = await loadProjectTasks(selectedProject.id);

      set({
        error: null,
        loading: false,
        projects,
        selectedProjectId: selectedProject.id,
        tasks,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown API error',
        loading: false,
        tasks: [],
      });
    }
  },
  createProject: async (name, description, status) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  updateProject: async (projectId, name, description, status) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  deleteProject: async (projectId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      const { selectedProjectId } = get();
      if (selectedProjectId === projectId) {
        set({ selectedProjectId: null });
      }

      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  createTask: async (title, description, status, priority) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status, priority }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  updateTask: async (taskId, title, description, status, priority) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status, priority }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  deleteTask: async (taskId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      await get().loadBoard();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  moveTask: async (taskId, newStatus) => {
    const { selectedProjectId, tasks } = get();
    if (!selectedProjectId) return;

    // Optimistic Update
    const previousTasks = [...tasks];
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    set({ tasks: updatedTasks });

    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }
      
      await get().loadBoard();
    } catch (error) {
      // Rollback
      set({ error: error instanceof Error ? error.message : 'Failed to move task', tasks: previousTasks });
    }
  },
}));
