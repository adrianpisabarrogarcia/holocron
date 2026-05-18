import type { ProjectSummary, ProjectTasksResponse, TaskItem } from '@holocron/contracts';
import { create } from 'zustand';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type BoardStore = {
  currentProject: ProjectSummary | null;
  error: string | null;
  isLoading: boolean;
  projects: ProjectSummary[];
  tasks: TaskItem[];
  loadBoard: () => Promise<void>;
};

export const useBoardStore = create<BoardStore>((set) => ({
  currentProject: null,
  error: null,
  isLoading: false,
  projects: [],
  tasks: [],
  loadBoard: async () => {
    set({ error: null, isLoading: true });

    try {
      const projectsResponse = await fetch(`${apiUrl}/api/projects`);

      if (!projectsResponse.ok) {
        throw new Error(`Projects request failed with ${projectsResponse.status}`);
      }

      const projects = (await projectsResponse.json()) as ProjectSummary[];
      const currentProject = projects[0] ?? null;

      if (!currentProject) {
        set({ currentProject: null, isLoading: false, projects: [], tasks: [] });
        return;
      }

      const tasksResponse = await fetch(`${apiUrl}/api/projects/${currentProject.id}/tasks`);

      if (!tasksResponse.ok) {
        throw new Error(`Tasks request failed with ${tasksResponse.status}`);
      }

      const payload = (await tasksResponse.json()) as ProjectTasksResponse;

      set({
        currentProject: payload.project,
        error: null,
        isLoading: false,
        projects,
        tasks: payload.tasks,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown API error',
        isLoading: false,
      });
    }
  },
}));
