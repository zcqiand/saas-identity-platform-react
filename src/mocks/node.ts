// MSW Node interceptor — used by vitest for component tests that hit fetch.
import { setupNodeMocks } from "@saas/identity-platform-msw/node";

export const server = setupNodeMocks();