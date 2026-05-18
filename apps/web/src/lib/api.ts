const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

type AuthHooks = {
  clearSession: () => void;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
};

let authHooks: AuthHooks | null = null;

export function setApiAuthHooks(hooks: AuthHooks) {
  authHooks = hooks;
}

export function getApiUrl(path: string) {
  return `${apiUrl}${path}`;
}

export async function apiFetch(path: string, init: RequestInit = {}, retried = false) {
  const headers = new Headers(init.headers);
  const accessToken = authHooks?.getAccessToken() ?? null;

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    credentials: 'include',
    headers,
  });

  if (response.status !== 401 || retried || !authHooks) {
    if (response.status === 401) {
      authHooks?.clearSession();
    }

    return response;
  }

  const refreshedToken = await authHooks.refreshAccessToken();

  if (!refreshedToken) {
    authHooks.clearSession();
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);

  return fetch(getApiUrl(path), {
    ...init,
    credentials: 'include',
    headers: retryHeaders,
  });
}

export async function parseJsonError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; message?: string };
    return payload.error?.message ?? payload.message ?? `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}
