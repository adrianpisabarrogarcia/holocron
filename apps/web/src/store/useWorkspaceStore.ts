import { create } from 'zustand';
import type { WorkspaceSummary } from '@holocron/contracts';
import { apiFetch, parseJsonError } from '../lib/api';

type WorkspaceState = {
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  loading: boolean;
  error: string | null;
  // Actions
  loadWorkspaces: () => Promise<void>;
  switchWorkspace: (slug: string) => Promise<void>;
  setActiveWorkspace: (ws: WorkspaceSummary) => void;
  createWorkspace: (data: { name: string; slug: string; description?: string; primaryColor?: string }) => Promise<WorkspaceSummary>;
  updateWorkspace: (slug: string, data: Partial<WorkspaceSummary>) => Promise<void>;
  deleteWorkspace: (slug: string) => Promise<void>;
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  loading: false,
  error: null,

  loadWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch('/workspaces');
      if (!res.ok) throw new Error(await parseJsonError(res));
      const workspaces = await res.json() as WorkspaceSummary[];
      set({ workspaces, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Error cargando workspaces' });
    }
  },

  switchWorkspace: async (slug: string) => {
    const res = await apiFetch('/workspaces/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) throw new Error(await parseJsonError(res));
    const activeWorkspace = get().workspaces.find((ws) => ws.slug === slug) ?? null;
    set({ activeWorkspace });
  },

  setActiveWorkspace: (ws: WorkspaceSummary) => set({ activeWorkspace: ws }),

  createWorkspace: async (data) => {
    const res = await apiFetch('/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseJsonError(res));
    const created = await res.json() as WorkspaceSummary;
    set((state) => ({ workspaces: [...state.workspaces, created] }));
    return created;
  },

  updateWorkspace: async (slug, data) => {
    const res = await apiFetch(`/workspaces/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await parseJsonError(res));
    const updated = await res.json() as WorkspaceSummary;
    set((state) => ({
      workspaces: state.workspaces.map((ws) => (ws.slug === slug ? { ...ws, ...updated } : ws)),
      activeWorkspace: state.activeWorkspace?.slug === slug ? { ...state.activeWorkspace, ...updated } : state.activeWorkspace,
    }));
  },

  deleteWorkspace: async (slug) => {
    const res = await apiFetch(`/workspaces/${slug}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await parseJsonError(res));
    set((state) => ({
      workspaces: state.workspaces.filter((ws) => ws.slug !== slug),
    }));
  },
}));
