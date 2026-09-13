// 后端配置：env-driven 单 URL（ADR-0014 — 完全镜像 saas-identity-platform-nextjs）。
//
// 旧 3-backend 运行时切换（msw / aspnetcore / springboot）+ localStorage 持久化
// + 模块单例 + Context 已废弃。改用：
//
//   VITE_API_BASE_URL    后端 base URL（默认 "http://localhost:5100" msw-http）
//   VITE_API_MODE        显示标签（默认 "msw-http"），仅 UI 显示
//
// ADR-0012 v0.3.0：Service Worker 模式完全删除。dev 路径只走 msw-http
//（独立 HTTP server，由 @saas/identity-platform-msw/src/server.ts 起在 :5100）；
// *_ENABLE_MSW env 与 isMswEnabled() 函数一并删除。
//
// 所有调用方从 `getBaseUrl()` / `getBackend()` 切到 `getApiBaseUrl()` / `getApiMode()`。

import { env } from "./env";

// === 2026-09-11 用户裁定：恢复 4 后端运行时切换（用户指令覆盖 ADR-0014 dev 单 URL）===
// prod 仍走部署期 env 同源反代；切换器是 dev/local 诊断工具（localStorage 持久化，
// 每次请求经 http-client 拦截器动态读取，切完下一个请求即生效）。端口表 = multi-repo-family §6。
//
// === 2026-09-13 用户裁定：切换器 prod 指生产路径 ===
// 此前候选全是 localhost:510x —— prod 浏览器里点谁都指向用户自己机器。
// build 期 import.meta.env.PROD 区分两端：dev 端口表见上；prod 域名 = 各仓
// deploy nginx vhost（saas-nextjs/aspnetcore/springboot.xiangru.uk）。msw 是
// 本地 mock 层无 prod 部署 → prod 构建从切换器剔除（key 保留，防旧 localStorage
// 残留让 find 落空）。
const IS_PROD_BUILD = import.meta.env.PROD;

export const BACKENDS = [
  { key: "msw", baseUrl: "http://localhost:5100", prodBaseUrl: null },
  {
    key: "nextjs",
    baseUrl: "http://localhost:5101",
    prodBaseUrl: "https://saas-nextjs.xiangru.uk",
  },
  {
    key: "aspnetcore",
    baseUrl: "http://localhost:5104",
    prodBaseUrl: "https://saas-aspnetcore.xiangru.uk",
  },
  {
    key: "springboot",
    baseUrl: "http://localhost:5105",
    prodBaseUrl: "https://saas-springboot.xiangru.uk",
  },
] as const;

/** 切换器可见项：prod 构建剔除 msw（无 prod 部署）。 */
export const SELECTABLE_BACKENDS = BACKENDS.filter(
  (b) => !IS_PROD_BUILD || b.prodBaseUrl !== null,
);

/** 按构建形态解析实际 base URL（prod 构建已确保 prodBaseUrl 非空才可见）。 */
function resolveBaseUrl(b: (typeof BACKENDS)[number]): string {
  return (IS_PROD_BUILD && b.prodBaseUrl) || b.baseUrl;
}

/** 展示用：某后端 key 的实际 base URL（prod 构建 → prod 域名，dev → localhost）。 */
export function resolveSelectedBackendUrl(key: string): string {
  const hit = BACKENDS.find((b) => b.key === key);
  return hit ? resolveBaseUrl(hit) : "";
}

const BACKEND_LS_KEY = "saas.api.backend";

/** 当前选中的后端 key（"" = 未选择，走 env 默认）。SSR 环境返回 ""。 */
export function getSelectedBackend(): string {
  try {
    return globalThis.localStorage?.getItem(BACKEND_LS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSelectedBackend(key: string): void {
  try {
    if (key) localStorage.setItem(BACKEND_LS_KEY, key);
    else localStorage.removeItem(BACKEND_LS_KEY);
  } catch {
    /* localStorage 不可用（隐私模式）：忽略 */
  }
}

export function getApiBaseUrl(): string {
  // 运行时切换优先；未选择（或选中项在当前构建不可见，如 prod 残留 msw）时走 env。
  const selected = getSelectedBackend();
  if (selected) {
    const hit = SELECTABLE_BACKENDS.find((b) => b.key === selected);
    if (hit) return resolveBaseUrl(hit);
  }
  return env.VITE_API_BASE_URL || "http://localhost:5100";
}

export function getApiMode(): string {
  return env.VITE_API_MODE || "msw-http";
}