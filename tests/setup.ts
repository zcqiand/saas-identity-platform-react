// vitest setup — enables React testing library matchers + DOM cleanup + api-client mock
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import {
  tenants,
  users,
  roles,
  apiKeys,
  apps,
  menus,
  roleMenuGrants,
  auditEvents,
} from "@saas/identity-platform-msw/fixtures";

// === Mock local orval api-client (@/api/endpoints/endpoints) ===
// orval 生成的 endpoints.ts 在模块加载时引 axios，vi.mock('axios') 会让本仓
// endpoints 模块初始化失败（只剩 getTitle 一个 export）。直接 mock api-client 模块更稳。
function page<T>(items: T[]) {
  return { items, page: 1, pageSize: items.length, total: items.length };
}

// react-query hook 形态：orval hook 返 { data: AxiosResponse<T>, isPending, ... }
// 所以 data 是双层 data.data。
function okHook<T>(payload: T) {
  return { data: { data: payload }, isPending: false, isLoading: false, error: null } as any;
}

vi.mock("@/api/endpoints/endpoints", () => ({
  authLogin: async (body: { username: string }) => ({
    data: {
      accessToken: `mock-jwt-${body.username}`,
      refreshToken: "mock-refresh",
      tokenType: "Bearer",
      expiresIn: 3600,
      userId: "u1",
      currentTenantId: "00000000-0000-0000-0000-000000000001",
    },
  }),
  authLogout: async () => ({ data: undefined }),
  authOidcCallback: async () => ({ data: { accessToken: "mock", tokenType: "Bearer", expiresIn: 3600 } }),
  authRefreshToken: async () => ({ data: { accessToken: "mock", tokenType: "Bearer", expiresIn: 3600 } }),

  adminTenantsListTenants: async () => ({ data: page(tenants) }),
  adminTenantsCreateTenant: async (body: any) => ({ data: { id: "new-tenant", ...body } }),
  adminTenantsGetTenant: async (id: string) => ({ data: { id, code: "acme", name: "ACME", status: "active" } }),
  adminTenantsUpdateTenant: async (id: string, body: any) => ({ data: { id, ...body } }),
  adminTenantsDeleteTenant: async () => ({ data: undefined }),

  tenantUsersListUsers: async () => ({ data: page(users) }),
  tenantUsersCreateUser: async (_t: string, body: any) => ({ data: { id: "new-user", ...body } }),
  tenantUsersGetUser: async () => ({ data: users[0] }),
  tenantUsersUpdateUser: async (_t: string, userId: string, body: any) => ({ data: { id: userId, ...body } }),
  tenantUsersDeleteUser: async () => ({ data: undefined }),
  tenantUsersAssignRoles: async (_t: string, userId: string, body: any) => ({ data: { id: userId, ...body } }),
  tenantUsersInviteUser: async (_t: string, body: any) => ({ data: { id: "new-user", ...body } }),
  tenantUsersChangeUserStatus: async (_t: string, userId: string, body: any) => ({ data: { id: userId, ...body } }),

  tenantRolesListRoles: async () => ({ data: page(roles) }),
  tenantRolesCreateRole: async (_t: string, body: any) => ({ data: { id: "new-role", ...body } }),
  tenantRolesGetRole: async () => ({ data: roles[0] }),
  tenantRolesUpdateRole: async (_t: string, roleId: string, body: any) => ({ data: { id: roleId, ...body } }),
  tenantRolesDeleteRole: async () => ({ data: undefined }),
  tenantRolesSetPermissions: async (_t: string, roleId: string, body: any) => ({ data: { id: roleId, ...body } }),

  tenantApiKeysListApiKeys: async () => ({ data: page(apiKeys) }),
  tenantApiKeysCreateApiKey: async (_t: string, body: any) => ({ data: { id: "new-key", prefix: "sk_live", status: "active", ...body } }),
  tenantApiKeysRevokeApiKey: async (_t: string, keyId: string) => ({ data: { id: keyId, status: "revoked" } }),
  tenantApiKeysRotateApiKey: async (_t: string, _k: string) => ({ data: { id: "rotated-key", prefix: "sk_live", status: "active" } }),

  adminAppsListApps: async () => ({ data: page(apps) }),
  adminAppsCreateApp: async (body: any) => ({ data: { id: "new-app", ...body } }),
  adminAppsGetApp: async (id: string) => ({ data: apps.find((a) => a.id === id) ?? apps[0] }),
  adminAppsUpdateApp: async (appId: string, body: any) => ({ data: { id: appId, ...body } }),
  adminAppsDeleteApp: async () => ({ data: undefined }),
  adminAppsSetAppStatus: async (appId: string, body: any) => ({ data: { id: appId, ...body } }),

  adminAppMenusListMenus: async (appId: string) => ({ data: menus.filter((m) => m.appId === appId) }),
  adminAppMenusCreateMenu: async (_a: string, body: any) => ({ data: { id: "new-menu", ...body } }),
  adminAppMenusGetMenu: async (_a: string, menuId: string) => ({ data: menus.find((m) => m.id === menuId) ?? menus[0] }),
  adminAppMenusUpdateMenu: async (_a: string, menuId: string, body: any) => ({ data: { id: menuId, ...body } }),
  adminAppMenusDeleteMenu: async () => ({ data: undefined }),
  adminAppMenusMoveMenu: async (_a: string, menuId: string, body: any) => ({ data: { id: menuId, ...body } }),
  adminAppMenusReorderMenus: async (_a: string, _m: string) => ({ data: menus }),

  tenantRoleMenusListRoleMenus: async (_t: string, roleId: string) => {
    const g = roleMenuGrants.find((x) => x.roleId === roleId);
    return { data: g ?? { roleId, menuIds: [], updatedAt: new Date().toISOString() } };
  },
  tenantRoleMenusSetRoleMenus: async (_t: string, roleId: string, body: any) => ({
    data: { roleId, menuIds: body.menuIds, updatedAt: new Date().toISOString() },
  }),
  tenantRoleMenusClearRoleMenus: async () => ({ data: undefined }),

  tenantAuditListAuditEvents: async () => ({ data: page(auditEvents) }),

  meWhoami: async () => ({ data: users[0] }),
  meGetMyMenus: async () => ({ data: {} }),
  meListMyTenants: async () => ({ data: [] }),
  meSwitchTenant: async () => ({ data: { tenantId: "t1", accessToken: "new" } }),

  oAuthAuthorize: async () => ({ data: { code: "auth-code" } }),
  oAuthToken: async () => ({ data: { accessToken: "oauth-tok", tokenType: "Bearer", expiresIn: 3600 } }),

  // === react-query hook mocks（M08/M09 异步消费点） ===
  useAdminAppsListApps: () => okHook(page(apps)),

  getTitle: () => "mocked",
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});