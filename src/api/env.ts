// Vite import.meta.env.VITE_* → 仓内唯一的适配点（参考 nextjs src/api/env.ts）。
//
// 后端配置（ADR-0014 — 完全镜像 saas-identity-platform-nextjs）：
//   VITE_API_BASE_URL    单 URL 后端地址；默认 "" 同源
//   VITE_ENABLE_MSW      Service Worker 启动开关（dev 默认 true，prod 默认 false）
//   VITE_API_MODE        显示标签；默认 "msw"（仅 UI 展示）
//
// 运行时不再切：删除 BackendProvider / useBackend / BackendSwitcher 整套。
// 部署期改 baseUrl = 改 .env.production / 部署平台环境变量。

export const env = {
  VITE_API_BASE_URL: readEnv("VITE_API_BASE_URL", ""),
  VITE_ENABLE_MSW:
    import.meta.env.VITE_ENABLE_MSW !== undefined
      ? import.meta.env.VITE_ENABLE_MSW === "true"
      : import.meta.env.MODE !== "production",
  VITE_API_MODE: readEnv("VITE_API_MODE", "msw"),
} as const;

function readEnv(key: string, fallback: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}