import type { AuthenticatedUser, ProjectMemberSummary, ProjectMembershipRole, PlatformRole, FolderMemberSummary } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, parseJsonError } from '../lib/api';

type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  platformRole: PlatformRole;
};

type AssignProjectMembershipInput = {
  projectId: string;
  role: ProjectMembershipRole;
  userId: string;
  scrumRole?: string | null;
};

type AssignFolderMembershipInput = {
  folderId: string;
  role: ProjectMembershipRole;
  userId: string;
};

type AdminStore = {
  assignProjectMembership: (input: AssignProjectMembershipInput) => Promise<ProjectMemberSummary>;
  assignFolderMembership: (input: AssignFolderMembershipInput) => Promise<FolderMemberSummary>;
  createUser: (input: CreateUserInput) => Promise<AuthenticatedUser>;
  createUserPending: boolean;
  loadUsers: () => Promise<void>;
  resetAdmin: () => void;
  users: AuthenticatedUser[];
  usersError: string | null;
  usersLoading: boolean;
  usersPending: boolean;
};

export const useAdminStore = create<AdminStore>((set) => ({
  assignProjectMembership: async ({ projectId, role, userId, scrumRole }) => {
    set({ usersError: null, usersPending: true });

    try {
      const response = await apiFetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, userId, scrumRole }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      return (await response.json()) as ProjectMemberSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown API error';
      set({ usersError: message });
      throw error;
    } finally {
      set({ usersPending: false });
    }
  },
  assignFolderMembership: async ({ folderId, role, userId }) => {
    set({ usersError: null, usersPending: true });

    try {
      const response = await apiFetch(`/api/folders/${folderId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role, userId }),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      return (await response.json()) as FolderMemberSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown API error';
      set({ usersError: message });
      throw error;
    } finally {
      set({ usersPending: false });
    }
  },
  createUser: async (input) => {
    set({ createUserPending: true, usersError: null });

    try {
      const response = await apiFetch('/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      const user = (await response.json()) as AuthenticatedUser;
      set((state) => ({
        users: [...state.users, user].sort((left, right) => left.name.localeCompare(right.name) || left.email.localeCompare(right.email)),
      }));
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown API error';
      set({ usersError: message });
      throw error;
    } finally {
      set({ createUserPending: false });
    }
  },
  createUserPending: false,
  loadUsers: async () => {
    set({ usersError: null, usersLoading: true });

    try {
      const response = await apiFetch('/admin/users');

      if (!response.ok) {
        throw new Error(await parseJsonError(response));
      }

      set({ users: (await response.json()) as AuthenticatedUser[], usersError: null, usersLoading: false });
    } catch (error) {
      set({
        users: [],
        usersError: error instanceof Error ? error.message : 'Unknown API error',
        usersLoading: false,
      });
    }
  },
  resetAdmin: () => set({ createUserPending: false, users: [], usersError: null, usersLoading: false, usersPending: false }),
  users: [],
  usersError: null,
  usersLoading: false,
  usersPending: false,
}));
