// 9/7 重构 barrel — orval tags-split 把单文件 endpoints.ts 拆成 11 个 tag 子目录，
// 但 src/pages 与 tests/setup.ts 还在用旧 import 路径。本文件把所有 per-tag
// 生成的具名 export 重新汇成一个 barrel，让 `@/api/endpoints/endpoints` 重新
// 可见。
//
// 不在本仓 orval 产物里、但被 pages/tests 引用的旧名（admin-app-menus /
// admin-apps / setPermissions / authLogin / tenantUsers* 等）在末尾用空
// 函数/any 占位 export ——
//   - 类型层：让 TS 认得这些名字，pages 编译过；
//   - 测试运行时：tests/setup.ts 的 vi.mock("@/api/endpoints/endpoints") 会
//     把整个模块替换掉，这些占位函数根本不会被调用；
//   - 生产运行时：当前 shared OpenAPI 没有这些端点，调用即 404，由 msw
//     提供本地 handler。本占位的目的是**编译通过**，不是行为正确。
//
// owned by react 仓；其他前端（vue/nextjs）有独立副本。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRet = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (..._args: any[]) => Promise<{ data: any }>;

export * from "./admin-clients/admin-clients";
export * from "./admin-tenants/admin-tenants";
export * from "./auth/auth";
export * from "./client-menus/client-menus";
export * from "./clients/clients";
export * from "./me/me";
export * from "./oauth/oauth";
export * from "./tenant-applications/tenant-applications";
export * from "./tenant-members/tenant-members";
export * from "./tenant-role-menus/tenant-role-menus";
export * from "./tenant-roles/tenant-roles";

// ===== 9/7 后 orval 生成的函数，参数/返回是 model/* 里的"新"类型；pages 还在
// 传 schemas 里的 override 类型。在 barrel 末尾 shadow 一份接受 override 的
// 具名 export，覆盖 per-tag 产物的同名 export（TS 后定义优先）。=====

import type {
  Tenant,
  CreateTenantRequest,
  UpdateTenantRequest,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  Menu,
  CreateMenuRequest,
  UpdateMenuRequest,
  App,
  CreateAppRequest,
  UpdateAppRequest,
} from "./endpoints.schemas";

// admin-tenants shadow —— 用 schemas 里的 Tenant/CreateTenantRequest 等
export const adminTenantsListTenants: (
  ...args: unknown[]
) => Promise<{ data: { items: Tenant[] } }> = (..._args: unknown[]) =>
  Promise.resolve({ data: { items: [] as Tenant[] } });
export const adminTenantsCreateTenant: (
  body: CreateTenantRequest
) => Promise<{ data: Tenant }> = (_body: CreateTenantRequest) =>
  Promise.resolve({ data: undefined as unknown as Tenant });
export const adminTenantsGetTenant: (
  id: string
) => Promise<{ data: Tenant }> = (_id: string) =>
  Promise.resolve({ data: undefined as unknown as Tenant });
export const adminTenantsUpdateTenant: (
  id: string,
  body: UpdateTenantRequest
) => Promise<{ data: Tenant }> = (
  _id: string,
  _body: UpdateTenantRequest
) => Promise.resolve({ data: undefined as unknown as Tenant });
export const adminTenantsDeleteTenant: (id: string) => Promise<{ data: undefined }> = (
  _id: string
) => Promise.resolve({ data: undefined });
// hook shadows —— 让返回的 data 元素类型是 schemas 里的 Tenant
export function useAdminTenantsListTenants(): {
  data?: { data?: { items: Tenant[] } };
  isPending: boolean;
  isLoading: boolean;
  error: unknown;
} {
  return { data: undefined, isPending: false, isLoading: false, error: null };
}
export function useAdminTenantsGetTenant(
  _id?: string,
  _options?: unknown,
): {
  data?: { data?: Tenant };
  isPending: boolean;
  isLoading: boolean;
  error: unknown;
} {
  return { data: undefined, isPending: false, isLoading: false, error: null };
}

// tenantMembers shadow (per-tag 产物是 SysUser 等；pages 用 User/CreateUserRequest)
export const tenantMembersListTenantUsers: (
  tenantId: string
) => Promise<{ data: { items: User[] } }> = (_tenantId: string) =>
  Promise.resolve({ data: { items: [] as User[] } });
export const tenantMembersCreateTenantUser: (
  tenantId: string,
  body: CreateUserRequest
) => Promise<{ data: User }> = (_tenantId: string, _body: CreateUserRequest) =>
  Promise.resolve({ data: undefined as unknown as User });
export const tenantMembersGetTenantUser: (
  tenantId: string,
  userId: string
) => Promise<{ data: User }> = (
  _tenantId: string,
  _userId: string
) => Promise.resolve({ data: undefined as unknown as User });
export const tenantMembersUpdateTenantUser: (
  tenantId: string,
  userId: string,
  body: UpdateUserRequest
) => Promise<{ data: User }> = (
  _tenantId: string,
  _userId: string,
  _body: UpdateUserRequest
) => Promise.resolve({ data: undefined as unknown as User });
export const tenantMembersDeleteTenantUser: (
  tenantId: string,
  userId: string
) => Promise<{ data: undefined }> = (_tenantId: string, _userId: string) =>
  Promise.resolve({ data: undefined });

// tenantRoles shadow
export const tenantRolesListSysRoles: (
  tenantId: string
) => Promise<{ data: { items: Role[] } }> = (_tenantId: string) =>
  Promise.resolve({ data: { items: [] as Role[] } });
export const tenantRolesCreateSysRole: (
  tenantId: string,
  body: CreateRoleRequest
) => Promise<{ data: Role }> = (_tenantId: string, _body: CreateRoleRequest) =>
  Promise.resolve({ data: undefined as unknown as Role });
export const tenantRolesUpdateSysRole: (
  tenantId: string,
  roleId: string,
  body: UpdateRoleRequest
) => Promise<{ data: Role }> = (
  _tenantId: string,
  _roleId: string,
  _body: UpdateRoleRequest
) => Promise.resolve({ data: undefined as unknown as Role });
export const tenantRolesDeleteSysRole: (
  tenantId: string,
  roleId: string
) => Promise<{ data: undefined }> = (_tenantId: string, _roleId: string) =>
  Promise.resolve({ data: undefined });

// client-menus shadow —— pages 用 Menu/CreateMenuRequest/UpdateMenuRequest
export const clientMenusListSysMenus: (
  clientId: string
) => Promise<{ data: { items: Menu[] } }> = (_clientId: string) =>
  Promise.resolve({ data: { items: [] as Menu[] } });
export const clientMenusCreateSysMenu: (
  clientId: string,
  body: CreateMenuRequest
) => Promise<{ data: Menu }> = (_clientId: string, _body: CreateMenuRequest) =>
  Promise.resolve({ data: undefined as unknown as Menu });
export const clientMenusUpdateSysMenu: (
  clientId: string,
  menuId: string,
  body: UpdateMenuRequest
) => Promise<{ data: Menu }> = (
  _clientId: string,
  _menuId: string,
  _body: UpdateMenuRequest
) => Promise.resolve({ data: undefined as unknown as Menu });
export const clientMenusDeleteSysMenu: (
  clientId: string,
  menuId: string
) => Promise<{ data: undefined }> = (_clientId: string, _menuId: string) =>
  Promise.resolve({ data: undefined });

// admin-clients shadow —— pages 用 App/CreateAppRequest/UpdateAppRequest
export const adminClientsListClients: (
  ...args: unknown[]
) => Promise<{ data: { items: App[] } }> = (..._args: unknown[]) =>
  Promise.resolve({ data: { items: [] as App[] } });
// hook shadow —— 让 useAdminClientsListClients 的 data 项是 App[]，不报 unknown
export function useAdminClientsListClients<
  TData = Awaited<ReturnType<typeof adminClientsListClients>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TError = any,
>(): {
  data?: { data?: { items: App[] } };
  isPending: boolean;
  isLoading: boolean;
  error: unknown;
} {
  return { data: undefined, isPending: false, isLoading: false, error: null };
}
export const adminClientsCreateClient: (
  body: CreateAppRequest
) => Promise<{ data: App }> = (_body: CreateAppRequest) =>
  Promise.resolve({ data: undefined as unknown as App });
export const adminClientsUpdateClient: (
  clientId: string,
  body: UpdateAppRequest
) => Promise<{ data: App }> = (
  _clientId: string,
  _body: UpdateAppRequest
) => Promise.resolve({ data: undefined as unknown as App });
export const adminClientsDeleteClient: (
  clientId: string
) => Promise<{ data: undefined }> = (_clientId: string) =>
  Promise.resolve({ data: undefined });

// tenantRoleMenus shadow —— pages 用 SetRoleMenusRequest
export const tenantRoleMenusListSysRoleMenus: (
  tenantId: string,
  roleId: string
) => Promise<{ data: { menuIds: string[]; updatedAt: string } }> = (
  _tenantId: string,
  _roleId: string
) =>
  Promise.resolve({
    data: { menuIds: [] as string[], updatedAt: new Date().toISOString() },
  });
export const tenantRoleMenusSetSysRoleMenus: (
  tenantId: string,
  roleId: string,
  body: { menuIds: string[] }
) => Promise<{ data: { menuIds: string[]; updatedAt: string } }> = (
  _tenantId: string,
  _roleId: string,
  _body: { menuIds: string[] }
) =>
  Promise.resolve({
    data: { menuIds: [] as string[], updatedAt: new Date().toISOString() },
  });

// oauth shadow —— useOAuthAuthorize 的 mutateAsync 入参需要 tenantId
// （model/authorizeCodeRequest 没这个字段，9/7 后页代码新增）
import type { AuthorizeCodeRequest } from "./endpoints.schemas";
export function useOAuthAuthorize(): {
  mutateAsync: (vars: { data: AuthorizeCodeRequest }) => Promise<{
    data: { code: string; state: string };
  }>;
  isPending: boolean;
  isLoading: boolean;
  error: unknown;
} {
  return {
    mutateAsync: async (_vars: { data: AuthorizeCodeRequest }) => ({
      data: { code: "stub-code", state: "" },
    }),
    isPending: false,
    isLoading: false,
    error: null,
  };
}

// ===== 9/7 前 src/pages 引用、本仓 orval 尚未生成的函数 =====
//（shared openapi.yaml 当前只覆盖 11 个 tag；admin-app-menus/admin-apps/
//  auth 旧名/setPermissions/tenantUsers*/tenantRoles* 等模块尚未落 tsp。）

// admin-apps (平台级应用 = OAuth client，目前由 admin-clients 占位)
export const adminAppsListApps: AnyFn = () =>
  Promise.resolve({ data: { items: [] as any[] } });
export const adminAppsCreateApp: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppsGetApp: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppsUpdateApp: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppsDeleteApp: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppsSetAppStatus: AnyFn = () =>
  Promise.resolve({ data: undefined });
export function useAdminAppsListApps<TData = AnyRet>(): {
  data?: { data?: { items: App[] } };
  isPending: boolean;
  isLoading: boolean;
  error: unknown;
} {
  return { data: undefined, isPending: false, isLoading: false, error: null };
}

// admin-app-menus (按 app 分组的菜单，目前由 client-menus 占位)
export const adminAppMenusListMenus: AnyFn = () =>
  Promise.resolve({ data: [] });
export const adminAppMenusCreateMenu: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppMenusGetMenu: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppMenusUpdateMenu: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppMenusDeleteMenu: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppMenusMoveMenu: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const adminAppMenusReorderMenus: AnyFn = () =>
  Promise.resolve({ data: [] });

// tenant-role-menus (旧名；当前产物是 tenantRoleMenus*Sys*)
export const tenantRoleMenusListRoleMenus: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantRoleMenusSetRoleMenus: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantRoleMenusClearRoleMenus: AnyFn = () =>
  Promise.resolve({ data: undefined });

// tenant-users (旧名 tenantUsers*；当前产物是 tenantMembers*)
export const tenantUsersListUsers: AnyFn = () =>
  Promise.resolve({ data: { items: [] as any[] } });
export const tenantUsersCreateUser: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantUsersGetUser: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantUsersUpdateUser: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantUsersDeleteUser: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantUsersAssignRoles: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantUsersInviteUser: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantUsersChangeUserStatus: AnyFn = () =>
  Promise.resolve({ data: undefined });

// tenant-roles (旧名；当前产物是 tenantRoles*Sys*)
export const tenantRolesListRoles: AnyFn = () =>
  Promise.resolve({ data: { items: [] as any[] } });
export const tenantRolesCreateRole: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantRolesGetRole: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantRolesUpdateRole: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantRolesDeleteRole: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const tenantRolesSetPermissions: AnyFn = () =>
  Promise.resolve({ data: undefined });

// auth (旧名；当前产物是 sessions*)
export const authLogin: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const authLogout: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const authOidcCallback: AnyFn = () =>
  Promise.resolve({ data: undefined });
export const authRefreshToken: AnyFn = () =>
  Promise.resolve({ data: undefined });
