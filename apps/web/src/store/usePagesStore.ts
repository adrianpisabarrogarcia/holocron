import type { PageSummary, PageDetail, PageVersionSummary, PageVersionDetail, UpdatePageInput, ReorderPagesInput } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, parseJsonError } from '../lib/api';

type PagesStore = {
  pages: PageSummary[];
  activePage: PageDetail | null;
  versions: PageVersionSummary[];
  selectedVersion: PageVersionDetail | null;
  loading: boolean;
  error: string | null;

  loadPages: (projectId: string) => Promise<void>;
  loadPage: (projectId: string, pageId: string) => Promise<void>;
  createPage: (projectId: string, title: string, content?: string, parentPageId?: string | null) => Promise<PageDetail>;
  updatePage: (projectId: string, pageId: string, updates: UpdatePageInput) => Promise<void>;
  deletePage: (projectId: string, pageId: string) => Promise<void>;
  reorderPages: (projectId: string, input: ReorderPagesInput) => Promise<void>;
  loadVersions: (projectId: string, pageId: string) => Promise<void>;
  loadVersion: (projectId: string, pageId: string, versionId: string) => Promise<void>;
  restoreVersion: (projectId: string, pageId: string, versionId: string) => Promise<void>;
  clearActivePage: () => void;
  resetPages: () => void;
};

export const usePagesStore = create<PagesStore>((set, get) => ({
  pages: [],
  activePage: null,
  versions: [],
  selectedVersion: null,
  loading: false,
  error: null,

  resetPages: () => set({ pages: [], activePage: null, versions: [], selectedVersion: null, loading: false, error: null }),

  loadPages: async (projectId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages`);
      if (!response.ok) throw new Error(await parseJsonError(response));
      const pages = (await response.json()) as PageSummary[];
      set({ pages, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  loadPage: async (projectId, pageId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/${pageId}`);
      if (!response.ok) throw new Error(await parseJsonError(response));
      const page = (await response.json()) as PageDetail;
      set({ activePage: page, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  createPage: async (projectId, title, content, parentPageId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, parentPageId }),
      });
      if (!response.ok) throw new Error(await parseJsonError(response));
      const page = (await response.json()) as PageDetail;
      await get().loadPages(projectId);
      set({ activePage: page, loading: false });
      return page;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  updatePage: async (projectId, pageId, updates) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error(await parseJsonError(response));
      const page = (await response.json()) as PageDetail;
      await get().loadPages(projectId);
      const { activePage } = get();
      set({ activePage: activePage?.id === pageId ? page : activePage, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  deletePage: async (projectId, pageId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/${pageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(await parseJsonError(response));
      const { activePage } = get();
      await get().loadPages(projectId);
      set({ activePage: activePage?.id === pageId ? null : activePage, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  reorderPages: async (projectId, input) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(await parseJsonError(response));
      const pages = (await response.json()) as PageSummary[];
      set({ pages, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  loadVersions: async (projectId, pageId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/${pageId}/versions`);
      if (!response.ok) throw new Error(await parseJsonError(response));
      const versions = (await response.json()) as PageVersionSummary[];
      set({ versions, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  loadVersion: async (projectId, pageId, versionId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/${pageId}/versions/${versionId}`);
      if (!response.ok) throw new Error(await parseJsonError(response));
      const version = (await response.json()) as PageVersionDetail;
      set({ selectedVersion: version, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  restoreVersion: async (projectId, pageId, versionId) => {
    set({ error: null, loading: true });
    try {
      const response = await apiFetch(`/api/projects/${projectId}/pages/${pageId}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(await parseJsonError(response));
      const page = (await response.json()) as PageDetail;
      await get().loadPages(projectId);
      await get().loadVersions(projectId, pageId);
      set({ activePage: page, selectedVersion: null, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown API error', loading: false });
      throw error;
    }
  },

  clearActivePage: () => set({ activePage: null, versions: [], selectedVersion: null }),
}));
