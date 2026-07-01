import type { ProjectSummary, TaskSummary, FolderSummary } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, parseJsonError } from '../lib/api';

type BoardStore = {
  error: string | null;
  loading: boolean;
  projects: ProjectSummary[];
  folders: FolderSummary[];
  resetBoard: () => void;
  selectedProjectId: string | null;
  selectProject: (projectId: string) => Promise<void>;
  tasks: TaskSummary[];
  loadBoard: () => Promise<void>;
  loadFolders: (projectId: string) => Promise<void>;
  createFolder: (name: string, parentFolderId?: string | null) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  createProject: (name: string, description?: string, status?: string, startDate?: string | null, endDate?: string | null) => Promise<void>;
  updateProject: (projectId: string, name?: string, description?: string, status?: string, startDate?: string | null, endDate?: string | null) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createTask: (title: string, description?: string, status?: string, priority?: string, folderId?: string | null) => Promise<void>;
  updateTask: (taskId: string, title?: string, description?: string, status?: string, priority?: string, folderId?: string | null) => Promise<void>;
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

async function loadProjectFolders(projectId: string) {
  const foldersResponse = await apiFetch(`/api/projects/${projectId}/folders`);

  if (!foldersResponse.ok) {
    throw new Error(await parseJsonError(foldersResponse));
  }

  return (await foldersResponse.json()) as FolderSummary[];
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  error: null,
  loading: false,
  projects: [],
  folders: [],
  resetBoard: () => set({ error: null, loading: false, projects: [], folders: [], selectedProjectId: null, tasks: [] }),
  selectedProjectId: null,
  selectProject: async (projectId) => {
    set({ error: null, loading: true, selectedProjectId: projectId });

    try {
      const [tasks, folders] = await Promise.all([
        loadProjectTasks(projectId),
        loadProjectFolders(projectId),
      ]);
      set({ error: null, loading: false, tasks, folders });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false, tasks: [], folders: [] });
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

      const [tasks, folders] = await Promise.all([
        loadProjectTasks(selectedProject.id),
        loadProjectFolders(selectedProject.id),
      ]);

      set({
        error: null,
        loading: false,
        projects,
        folders,
        selectedProjectId: selectedProject.id,
        tasks,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown API error',
        loading: false,
        tasks: [],
        folders: [],
      });
    }
  },
  createProject: async (name, description, status, startDate, endDate) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status, startDate, endDate }),
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
  updateProject: async (projectId, name, description, status, startDate, endDate) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status, startDate, endDate }),
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
  createTask: async (title, description, status, priority, folderId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status, priority, folderId }),
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
  updateTask: async (taskId, title, description, status, priority, folderId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status, priority, folderId }),
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
  loadFolders: async (projectId) => {
    set({ error: null, loading: true });
    try {
      const folders = await loadProjectFolders(projectId);
      set({ error: null, folders, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false, folders: [] });
    }
  },
  createFolder: async (name, parentFolderId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentFolderId }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      const newFolder = (await response.json()) as FolderSummary;
      set((state) => ({
        folders: [...state.folders, newFolder],
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
  deleteFolder: async (folderId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      set((state) => ({
        folders: state.folders.filter((f) => f.id !== folderId),
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },
}));
