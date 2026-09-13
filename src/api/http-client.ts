// HTTP client — axios + 1:1 endpoint mapping via local orval codegen.
//
// 端点 1:1 映射由 src/api/endpoints/endpoints.ts（本地 orval 产物）提供
//（orval 从 ../saas-identity-platform-shared/generated/openapi/openapi.yaml 生成，
// 每个端点对应一个具名函数 + 一个 react-query hook）。
// 本文件做两件事：
//   1) 装 axios 拦截器：每次请求从部署期配置（VITE_API_BASE_URL）拿 baseUrl，
//      从 getToken callback 拿 token，写进 Authorization 头
//   2) 提供 ApiError 封装（low-level fetch 走 axios 错误时统一）
//
// ADR-0014：runtime baseUrl 已废弃，改走 env-driven 单 URL。

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "./backend-config";

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any, message?: string) {
    super(message ?? `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** 从 axios 错误构造 ApiError（响应体里的 ErrorResponse 直接透传） */
export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<any>;
    return new ApiError(axErr.response?.status ?? 0, axErr.response?.data ?? null, axErr.message);
  }
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError(0, null, err.message);
  return new ApiError(0, null, String(err));
}

/**
 * 注入运行时 baseUrl + Bearer token。
 * 在 main.tsx 启动时调一次；getToken 用 callback 形式避免循环依赖
 * （tenant-context → http-client 不能反向指）。
 */

/** 401 时清本地会话并跳登录页（保留后端切换选择）。 */
function handleUnauthorized(): void {
  // 2026-09-13 修 prod 登录死循环（同 saas-vue 报告）：此处曾删 `saas.react.session`
  // 等旧 schema 键名，而 tenant-context 实际持久化在 `saas.tenant` —— 401 从未
  // 清掉真会话 → /login 守卫见 isAuthenticated=true 又送回 /tenants →
  // me/tenants 401 → location.assign("/login") → 无限跳。改扫全部 saas.* 键。
  try {
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("saas.") && k !== "saas.api.backend") stale.push(k);
    }
    stale.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* localStorage 不可用：ignore */
  }
  window.location.assign("/login");
}

export function installHttpClient(getToken: () => string | null): void {
  axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    const token = getToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });
    // 401（token 过期/无效）→ 清本地会话并踢回登录页重新登录（用户裁定 2026-09-12）。
    axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          const url = err.config?.url ?? "";
          const isAuthFlow = /\/api\/v1\/(auth|oauth)\//.test(url);
          const onLogin = window.location.pathname.startsWith("/login");
          if (!isAuthFlow && !onLogin) {
            handleUnauthorized();
          }
        }
        return Promise.reject(err);
      },
    );
}

// 兼容老调用方：低阶 fetch 包装（仅用于不走 axios 的兜底场景）
export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
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

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
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

export { getApiBaseUrl, getApiMode } from "./backend-config";