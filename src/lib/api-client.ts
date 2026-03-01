/**
 * ShelfWise API Client
 * Typed fetch wrapper for the FastAPI backend.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Token management ─────────────────────────────────
const TOKEN_KEY = "shelfwise_access_token";
const REFRESH_KEY = "shelfwise_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ── Refresh logic ────────────────────────────────────
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const resp = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!resp.ok) {
      clearTokens();
      return false;
    }

    const data = await resp.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ── Core fetch wrapper ───────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 with token refresh
  if (resp.status === 401 && retry) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }

    // Refresh failed — clear tokens, let React auth context handle redirect
    clearTokens();
    throw new Error("Session expired");
  }

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(error.detail || error.message || `API error: ${resp.status}`);
  }

  // Handle empty responses (204, etc.)
  const text = await resp.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ── Public API methods ───────────────────────────────
export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: "GET" }),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

// ── Auth helpers ─────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, password: string, full_name: string) =>
    api.post<AuthResponse>("/api/auth/register", { email, password, full_name }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { email, password }),

  googleAuth: (credential: string) =>
    api.post<AuthResponse>("/api/auth/google", { credential }),

  getMe: () => api.get<AuthUser>("/api/auth/me"),

  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    api.put<AuthUser>("/api/auth/profile", data),

  updatePassword: (password: string) =>
    api.put("/api/auth/password", { password }),

  requestPasswordReset: (email: string) =>
    api.post("/api/auth/reset-password", { email }),

  confirmPasswordReset: (token: string, password: string) =>
    api.post("/api/auth/reset-password/confirm", { token, password }),

  signOut: () => {
    clearTokens();
  },
};

// ── WebSocket for notifications ──────────────────────
export function createNotificationSocket(
  onMessage: (data: unknown) => void
): WebSocket | null {
  const token = getAccessToken();
  if (!token) return null;

  const wsUrl = API_URL.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsUrl}/api/ws/notifications?token=${token}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // ignore non-JSON messages (like "pong")
    }
  };

  // Ping to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("ping");
    }
  }, 30000);

  ws.onclose = () => clearInterval(pingInterval);

  return ws;
}

export { API_URL };
