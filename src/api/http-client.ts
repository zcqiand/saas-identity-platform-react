// HTTP client: injects Authorization + tenant context. Wraps fetch.
import { useTenant } from "../state/tenant-context";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any, message?: string) {
    super(message ?? `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Hook variant: auto-injects current tenant token. */
export function useApi() {
  const { accessToken, currentTenantId } = useTenant();
  return useApiWith(accessToken, currentTenantId);
}

export function useApiWith(token: string | null, _tenantId: string | null) {
  return {
    get: <T>(p: string) => apiRequest<T>(p, { method: "GET" }, token),
    post: <T>(p: string, body: unknown) => apiRequest<T>(p, { method: "POST", body }, token),
    put: <T>(p: string, body: unknown) => apiRequest<T>(p, { method: "PUT", body }, token),
    patch: <T>(p: string, body: unknown) => apiRequest<T>(p, { method: "PATCH", body }, token),
    del: <T>(p: string) => apiRequest<T>(p, { method: "DELETE" }, token),
  };
}
