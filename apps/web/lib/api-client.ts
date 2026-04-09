const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const ACCESS_TOKEN_KEY = 'buildos_access_token';
const REFRESH_TOKEN_KEY = 'buildos_refresh_token';
const SESSION_START_KEY = 'buildos_session_start';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getSessionStart(): number | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(SESSION_START_KEY);
  return val ? Number(val) : null;
}

export function setSessionStart(ts: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_START_KEY, String(ts));
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(SESSION_START_KEY);
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Skip attaching Bearer token (login/register) */
  skipAuth?: boolean;
};

function formatErrorMessage(payload: { message?: unknown }): string {
  const m = payload.message;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string') return m;
  return 'Request failed';
}

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const token = !skipAuth ? getAccessToken() : null;
  const authHeaders: Record<string, string> = {};
  if (token) authHeaders.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    const aborted =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    if (aborted) {
      throw new Error(
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Is the API running at ${API_URL}?`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401 && !skipAuth) {
    clearAccessToken();
    onUnauthorized?.();
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(formatErrorMessage(error));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

const FORM_UPLOAD_TIMEOUT_MS = 120_000;

async function requestFormData<T>(path: string, form: FormData): Promise<T> {
  const token = getAccessToken();
  const authHeaders: Record<string, string> = {};
  if (token) authHeaders.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FORM_UPLOAD_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: authHeaders,
      body: form,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    const aborted =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError');
    if (aborted) {
      throw new Error(
        `Upload timed out after ${FORM_UPLOAD_TIMEOUT_MS / 1000}s. Is the API running at ${API_URL}?`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401) {
    clearAccessToken();
    onUnauthorized?.();
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(formatErrorMessage(error));
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, opts?: { skipAuth?: boolean }) =>
    request<T>(path, { method: 'POST', body, skipAuth: opts?.skipAuth }),
  postForm: <T>(path: string, form: FormData) => requestFormData<T>(path, form),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string | null;
  name: string | null;
  role: string;
  supabaseId?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | undefined;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | undefined;
};

export type RegisterResponse = LoginResponse & {
  tenant: { id: string; name: string; slug: string };
  user: { id: string; email: string | null; name: string | null; role: string };
};
