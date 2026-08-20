// MSW browser worker setup for React dev mode.
//
// 后端是否启用 MSW 走 env（ADR-0014 — 完全镜像 nextjs）：
//   VITE_ENABLE_MSW=false 时跳过；fetch 直走 VITE_API_BASE_URL 真后端。
import { setupBrowserMocks } from "@saas/identity-platform-msw/browser";
import { isMswEnabled } from "@/api/backend-config";

export async function enableMocking() {
  if (import.meta.env.PROD) return;
  if (!isMswEnabled()) return;
  await setupBrowserMocks();
}