import type { AuthResponse, AuthenticatedUser, PlatformRole } from '@holocron/contracts';
import { create } from 'zustand';
import { apiFetch, getApiUrl, parseJsonError, setApiAuthHooks } from '../lib/api';
import { useAdminStore } from './useAdminStore';
import { useBoardStore } from './useBoardStore';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  platformRole?: PlatformRole;
};

type AuthStore = {
  accessToken: string | null;
  error: string | null;
  status: AuthStatus;
  user: AuthenticatedUser | null;
  bootstrap: () => Promise<void>;
  clearSession: () => void;
  createUser: (input: CreateUserInput) => Promise<AuthenticatedUser>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
};

let bootstrapPromise: Promise<void> | null = null;
let refreshPromise: Promise<string | null> | null = null;

function applyAuthPayload(set: (partial: Partial<AuthStore>) => void, payload: AuthResponse) {
  set({
    accessToken: payload.accessToken,
    error: null,
    status: 'authenticated',
    user: payload.user,
  });
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  error: null,
  status: 'loading',
  user: null,
  bootstrap: async () => {
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        const token = await useAuthStore.getState().refreshSession();

        if (!token) {
          set({ accessToken: null, error: null, status: 'unauthenticated', user: null });
        }
      })().finally(() => {
        bootstrapPromise = null;
      });
    }

    await bootstrapPromise;
  },
  clearSession: () => {
    useAdminStore.getState().resetAdmin();
    useBoardStore.getState().resetBoard();
    set({ accessToken: null, error: null, status: 'unauthenticated', user: null });
  },
  createUser: async (input) => useAdminStore.getState().createUser({ ...input, platformRole: input.platformRole ?? 'MEMBER' }),
  login: async (email, password) => {
    set({ error: null, status: 'loading' });

    const response = await fetch(getApiUrl('/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      set({ accessToken: null, error: await parseJsonError(response), status: 'unauthenticated', user: null });
      return;
    }

    const payload = (await response.json()) as AuthResponse;
    applyAuthPayload(set, payload);
  },
  logout: async () => {
    await fetch(getApiUrl('/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });

    useAuthStore.getState().clearSession();
  },
  refreshSession: async () => {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const response = await fetch(getApiUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          set({ accessToken: null, error: null, status: 'unauthenticated', user: null });
          return null;
        }

        const payload = (await response.json()) as AuthResponse;
        applyAuthPayload(set, payload);
        return payload.accessToken;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },
}));

setApiAuthHooks({
  clearSession: () => useAuthStore.getState().clearSession(),
  getAccessToken: () => useAuthStore.getState().accessToken,
  refreshAccessToken: () => useAuthStore.getState().refreshSession(),
});
