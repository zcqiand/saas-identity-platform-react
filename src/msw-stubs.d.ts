// Ambient stub declarations for @saas/identity-platform-msw to prevent tsc from
// resolving into the symlinked src/ directory (which has compile errors when
// consumed outside its own仓). The real runtime imports resolve via the
// vite/vitest bundler, not tsc.
//
// We stub only the shape used by React at compile time: handlers array,
// fixtures, and the setup helpers.
// Runtime behavior comes from the actual package.

declare module "@saas/identity-platform-msw" {
  export const handlers: unknown[];
  export const fixtures: Record<string, unknown>;
  export const getTenant: (id: string) => unknown;
  export const listTenants: () => unknown[];
  export const getUser: (tenantId: string, userId: string) => unknown;
  export const listUsers: (tenantId: string) => unknown[];
  export const getRole: (tenantId: string, roleId: string) => unknown;
  export const listRoles: (tenantId: string) => unknown[];
  export const getApiKey: (tenantId: string, keyId: string) => unknown;
  export const listApiKeys: (tenantId: string) => unknown[];
  export const listAuditEvents: (tenantId: string) => unknown[];
  const _default: Record<string, unknown>;
  export default _default;
}

declare module "@saas/identity-platform-msw/browser" {
  export function setupBrowserMocks(): Promise<unknown>;
}

declare module "@saas/identity-platform-msw/node" {
  export function setupNodeMocks(): unknown;
}