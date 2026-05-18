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
}));
