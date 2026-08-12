// MSW browser worker setup for React dev mode.
import { setupBrowserMocks } from "@saas/identity-platform-msw/browser";

export async function enableMocking() {
  if (import.meta.env.PROD) return;
  await setupBrowserMocks();
}