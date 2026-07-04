/**
 * Minimal typed fetch helper for Phase 2A endpoints.
 * Reads the JWT from localStorage the same way auth.tsx does,
 * so auth never diverges between generated hooks and hand-written ones.
 */
const TOKEN_KEY = "ai_brain_os_token";

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); message = j.error ?? message; } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string) { return apiFetch<T>(path); }
export function apiPost<T>(path: string, body?: unknown) { return apiFetch<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }); }
export function apiPatch<T>(path: string, body?: unknown) { return apiFetch<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }); }
export function apiDelete<T = void>(path: string) { return apiFetch<T>(path, { method: "DELETE" }); }
