import type { ProjectSummary, TaskSummary, FolderSummary, ProjectMemberSummary, SprintSummary, CommentSummary } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, parseJsonError } from '../lib/api';

type BoardStore = {
  error: string | null;
  loading: boolean;
  projects: ProjectSummary[];
  folders: FolderSummary[];
  activeWorkspaceSlug: string | null;
  resetBoard: () => void;
  selectedProjectId: string | null;
  selectProject: (projectId: string) => Promise<void>;
  tasks: TaskSummary[];
  members: ProjectMemberSummary[];
  sprints: SprintSummary[];
  loadBoard: (workspaceSlug?: string) => Promise<void>;
  loadFolders: () => Promise<void>;
  createFolder: (name: string, parentFolderId?: string | null) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  createProject: (name: string, description?: string, status?: string, startDate?: string | null, endDate?: string | null, folderId?: string | null) => Promise<void>;
  updateProject: (projectId: string, name?: string, description?: string, status?: string, startDate?: string | null, endDate?: string | null, folderId?: string | null) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  createTask: (title: string, description?: string, type?: TaskSummary['type'], status?: string, priority?: string, isBlocked?: boolean, blockedReason?: string | null, ownerIds?: string[], assigneeIds?: string[], sprintId?: string | null, startDate?: string | null, endDate?: string | null, estimatedHours?: number | null, timeSpent?: number, timerStartedAt?: string | null) => Promise<void>;
  updateTask: (taskId: string, title?: string, description?: string, type?: TaskSummary['type'], status?: string, priority?: string, isBlocked?: boolean, blockedReason?: string | null, ownerIds?: string[], assigneeIds?: string[], sprintId?: string | null, startDate?: string | null, endDate?: string | null, estimatedHours?: number | null, timeSpent?: number, timerStartedAt?: string | null) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newStatus: TaskSummary['status']) => Promise<void>;
  syncColumns: (projectId: string, columns: { id?: string; name: string; emoji?: string | null; position: number }[]) => Promise<void>;
  uploadFile: (filename: string, base64Data: string) => Promise<{ url: string; filename: string }>;
  deleteUpload: (filename: string) => Promise<void>;
  createSprint: (name: string, startDate?: string | null, endDate?: string | null) => Promise<void>;
  updateSprint: (sprintId: string, name?: string, startDate?: string | null, endDate?: string | null, status?: SprintSummary['status'], position?: number) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  fetchComments: (taskId: string) => Promise<CommentSummary[]>;
  createComment: (taskId: string, content: string) => Promise<CommentSummary>;
  updateComment: (taskId: string, commentId: string, content: string) => Promise<CommentSummary>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;
};

async function loadProjectMembers(projectId: string) {
  const membersResponse = await apiFetch(`/api/projects/${projectId}/members`);

  if (!membersResponse.ok) {
    throw new Error(await parseJsonError(membersResponse));
  }

  return (await membersResponse.json()) as ProjectMemberSummary[];
}


async function loadProjectTasks(projectId: string) {
  const tasksResponse = await apiFetch(`/api/projects/${projectId}/tasks`);

  if (!tasksResponse.ok) {
    throw new Error(await parseJsonError(tasksResponse));
  }

  return (await tasksResponse.json()) as TaskSummary[];
}

async function loadProjectSprints(projectId: string) {
  const sprintsResponse = await apiFetch(`/api/projects/${projectId}/sprints`);

  if (!sprintsResponse.ok) {
    throw new Error(await parseJsonError(sprintsResponse));
  }

  return (await sprintsResponse.json()) as SprintSummary[];
}

async function loadProjectFolders(workspaceSlug?: string) {
  const qs = workspaceSlug ? `?workspaceSlug=${encodeURIComponent(workspaceSlug)}` : '';
  const foldersResponse = await apiFetch(`/api/folders${qs}`);

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
  activeWorkspaceSlug: null,
  resetBoard: () => set({ error: null, loading: false, projects: [], folders: [], selectedProjectId: null, tasks: [], members: [], sprints: [], activeWorkspaceSlug: null }),
  selectedProjectId: null,
  selectProject: async (projectId) => {
    set({ error: null, loading: true, selectedProjectId: projectId });

    try {
      const [tasks, members, sprints] = await Promise.all([
        loadProjectTasks(projectId),
        loadProjectMembers(projectId),
        loadProjectSprints(projectId),
      ]);
      set({ error: null, loading: false, tasks, members, sprints });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false, tasks: [], members: [], sprints: [] });
    }
  },
  tasks: [],
  members: [],
  sprints: [],
  loadBoard: async (workspaceSlug?: string) => {
    // Skip reload if already loaded for this workspace slug
    const currentSlug = get().activeWorkspaceSlug;
    if (workspaceSlug && workspaceSlug === currentSlug && get().projects.length > 0) return;

    // Si cambia el workspace, limpia inmediatamente para no mostrar datos del workspace anterior
    if (workspaceSlug !== currentSlug) {
      set({ projects: [], folders: [], tasks: [], members: [], sprints: [], selectedProjectId: null });
    }

    set({ error: null, loading: true });

    try {
      const qs = workspaceSlug ? `?workspaceSlug=${encodeURIComponent(workspaceSlug)}` : '';
      const projectsResponse = await apiFetch(`/api/projects${qs}`);

      if (!projectsResponse.ok) {
        throw new Error(await parseJsonError(projectsResponse));
      }

      const projects = (await projectsResponse.json()) as ProjectSummary[];
      const { selectedProjectId } = get();
      const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null;

      if (!selectedProject) {
        set({ error: null, loading: false, projects: [], selectedProjectId: null, tasks: [], members: [], sprints: [], activeWorkspaceSlug: workspaceSlug ?? null });
        return;
      }

      const [tasks, folders, members, sprints] = await Promise.all([
        loadProjectTasks(selectedProject.id),
        loadProjectFolders(workspaceSlug),
        loadProjectMembers(selectedProject.id),
        loadProjectSprints(selectedProject.id),
      ]);

      set({
        error: null,
        loading: false,
        projects,
        folders,
        selectedProjectId: selectedProject.id,
        tasks,
        members,
        sprints,
        activeWorkspaceSlug: workspaceSlug ?? null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown API error',
        loading: false,
        tasks: [],
        folders: [],
        members: [],
      });
    }
  },
  createProject: async (name, description, status, startDate, endDate, folderId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status, startDate, endDate, folderId }),
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
  updateProject: async (projectId, name, description, status, startDate, endDate, folderId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, status, startDate, endDate, folderId }),
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
  createTask: async (title, description, type, status, priority, isBlocked, blockedReason, ownerIds, assigneeIds, sprintId, startDate, endDate, estimatedHours, timeSpent, timerStartedAt) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          status,
          priority,
          isBlocked,
          blockedReason,
          ownerIds,
          assigneeIds,
          sprintId,
          startDate,
          endDate,
          estimatedHours,
          timeSpent,
          timerStartedAt
        }),
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
  updateTask: async (taskId, title, description, type, status, priority, isBlocked, blockedReason, ownerIds, assigneeIds, sprintId, startDate, endDate, estimatedHours, timeSpent, timerStartedAt) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          status,
          priority,
          isBlocked,
          blockedReason,
          ownerIds,
          assigneeIds,
          sprintId,
          startDate,
          endDate,
          estimatedHours,
          timeSpent,
          timerStartedAt
        }),
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
  loadFolders: async () => {
    set({ error: null, loading: true });
    try {
      const folders = await loadProjectFolders(get().activeWorkspaceSlug ?? undefined);
      set({ error: null, folders, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false, folders: [] });
    }
  },
  createFolder: async (name, parentFolderId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch('/api/folders', {
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
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/folders/${folderId}`, {
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
  syncColumns: async (projectId, columns) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/columns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns }),
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
  uploadFile: async (filename: string, base64Data: string) => {
    const response = await apiFetch('/api/tasks/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, base64Data }),
    });
    if (!response.ok) {
      throw new Error(await parseJsonError(response));
    }
    return (await response.json()) as { url: string; filename: string };
  },
  deleteUpload: async (filename: string) => {
    const response = await apiFetch(`/api/tasks/upload/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await parseJsonError(response));
    }
  },
  createSprint: async (name, startDate, endDate) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate }),
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
  updateSprint: async (sprintId, name, startDate, endDate, status, position) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/sprints/${sprintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate, status, position }),
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
  deleteSprint: async (sprintId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${selectedProjectId}/sprints/${sprintId}`, {
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
  fetchComments: async (taskId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}/comments`);
    if (!response.ok) {
      throw new Error(await parseJsonError(response));
    }
    return (await response.json()) as CommentSummary[];
  },
  createComment: async (taskId, content) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(await parseJsonError(response));
    }
    return (await response.json()) as CommentSummary;
  },
  updateComment: async (taskId, commentId, content) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error(await parseJsonError(response));
    }
    return (await response.json()) as CommentSummary;
  },
  deleteComment: async (taskId, commentId) => {
    const { selectedProjectId } = get();
    if (!selectedProjectId) throw new Error('No project selected');
    const response = await apiFetch(`/api/projects/${selectedProjectId}/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await parseJsonError(response));
    }
  },
}));
