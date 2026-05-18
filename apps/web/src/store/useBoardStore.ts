import type { ProjectSummary, TaskSummary } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, parseJsonError } from '../lib/api';

type BoardStore = {
  error: string | null;
  loading: boolean;
  projects: ProjectSummary[];
  resetBoard: () => void;
  selectedProjectId: string | null;
  tasks: TaskSummary[];
  loadBoard: () => Promise<void>;
};

export const useBoardStore = create<BoardStore>((set) => ({
  error: null,
  loading: false,
  projects: [],
  resetBoard: () => set({ error: null, loading: false, projects: [], selectedProjectId: null, tasks: [] }),
  selectedProjectId: null,
  tasks: [],
  loadBoard: async () => {
    set({ error: null, loading: true });

    try {
      const projectsResponse = await apiFetch('/api/projects');

      if (!projectsResponse.ok) {
        throw new Error(await parseJsonError(projectsResponse));
      }

      const projects = (await projectsResponse.json()) as ProjectSummary[];
      const selectedProject = projects[0] ?? null;

      if (!selectedProject) {
        set({ error: null, loading: false, projects: [], selectedProjectId: null, tasks: [] });
        return;
      }

      const tasksResponse = await apiFetch(`/api/projects/${selectedProject.id}/tasks`);

      if (!tasksResponse.ok) {
        throw new Error(await parseJsonError(tasksResponse));
      }

      const tasks = (await tasksResponse.json()) as TaskSummary[];

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
