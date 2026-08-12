// MSW handlers — re-exported from @saas/identity-platform-msw (shared仓).
// Per-frontend customization can override specific handlers here.
import { handlers as sharedHandlers, fixtures } from "@saas/identity-platform-msw";
export const handlers = sharedHandlers;
export { fixtures };
export default handlers;