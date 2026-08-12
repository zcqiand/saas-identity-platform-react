// MSW browser worker setup for React dev mode.
//
// 后端运行时切换：仅在 VITE_BACKEND === "msw"（默认）时启用 worker。
// 切到 aspnetcore / springboot 后，fetch 直走后端真实地址。
import { setupBrowserMocks } from "@saas/identity-platform-msw/browser";
import { getBackend } from "@/api/backend-config";

export async function enableMocking() {
  if (import.meta.env.PROD) return;
  if (getBackend() !== "msw") return;
  await setupBrowserMocks();
}