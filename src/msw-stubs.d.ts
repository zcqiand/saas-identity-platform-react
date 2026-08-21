// Ambient stub declarations for @saas/identity-platform-msw to prevent tsc from
// resolving into the symlinked src/ directory (which has compile errors when
// consumed outside its own仓). The real runtime imports resolve via the
// vite/vitest bundler, not tsc.

interface Tenant {
  id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  status: string;
  roleIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  permissionIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;
  status: string;
  scopes: string[];
  createdAt: string;
}

interface AuditEvent {
  id: string;
  tenantId: string;
  actorUserId?: string;
  action: string;
  occurredAt: string;
}

interface Membership {
  id: string;
  tenantId: string;
  roleIds: string[];
  status: string;
}

interface OAuthApp {
  id: string;
  clientId: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: string[];
  isFirstParty: boolean;
}

declare module "@saas/identity-platform-msw" {
  export const handlers: unknown[];
  export const fixtures: {
    tenants: Tenant[];
    users: User[];
    roles: Role[];
    apiKeys: ApiKey[];
    oauthApps: OAuthApp[];
    auditEvents: AuditEvent[];
    memberships: Membership[];
  };
  export const tenants: Tenant[];
  export const users: User[];
  export const roles: Role[];
  export const apiKeys: ApiKey[];
  export const oauthApps: OAuthApp[];
  export const auditEvents: AuditEvent[];
  export const memberships: Membership[];
  export const TENANT_IDS: { acme: string; globex: string; initech: string };
  export const getTenant: (id: string) => Tenant | undefined;
  export const listTenants: () => Tenant[];
  export const getUser: (tenantId: string, userId: string) => User | undefined;
  export const listUsers: (tenantId: string) => User[];
  export const getRole: (tenantId: string, roleId: string) => Role | undefined;
  export const listRoles: (tenantId: string) => Role[];
  export const getApiKey: (tenantId: string, keyId: string) => ApiKey | undefined;
  export const listApiKeys: (tenantId: string) => ApiKey[];
  export const listAuditEvents: (tenantId: string) => AuditEvent[];
  const _default: {
    tenants: Tenant[];
    users: User[];
    roles: Role[];
    apiKeys: ApiKey[];
    oauthApps: OAuthApp[];
    auditEvents: AuditEvent[];
    memberships: Membership[];
  };
  export default _default;
}

declare module "@saas/identity-platform-msw/node" {
  export function setupNodeMocks(): unknown;
}
