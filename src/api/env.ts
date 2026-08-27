// Vite import.meta.env.VITE_* → 仓内唯一的适配点（参考 nextjs src/api/env.ts）。
//
// 后端配置（ADR-0014 — 完全镜像 saas-identity-platform-nextjs）：
//   VITE_API_BASE_URL    单 URL 后端地址；默认 "" 同源
//   VITE_API_MODE        显示标签；默认 "msw"（仅 UI 展示）
//
// 运行时不再切：删除 BackendProvider / useBackend / BackendSwitcher 整套。
// ADR-0012 v0.3.0：删除 VITE_ENABLE_MSW（Service Worker 模式已删除）。
// 部署期改 baseUrl = 改 .env.production / 部署平台环境变量。

export const env = {
  VITE_API_BASE_URL: readEnv("VITE_API_BASE_URL", ""),
  VITE_API_MODE: readEnv("VITE_API_MODE", "msw"),
} as const;

function readEnv(key: string, fallback: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}