// 9/7 重构 schemas barrel — orval tags-split 把所有 schema 拆到 model/ 子目录，
// 但 src/pages 还在用旧 `@/api/endpoints/endpoints.schemas` 路径。本文件做：
//
// 1. 从 model/ 选 re-export 真实生成的 schema（仅命名导出需要的，避免污染）
// 2. 对 9/7 之前页代码期待的"老名字/老字段"做 override 类型声明
//
// 注意：override 类型与 orval 生成的结构对不齐是**预期**——shared 的 OpenAPI
// 9/7 之后才落地 tsp，旧页代码假设的字段名/类型是上一代契约。要彻底消除
// override 必须同 commit 改 shared openapi.yaml + 4 后端 + contract-test；
// 当前 L3 关只要求类型层通过，runtime 行为由 tests/setup.ts mock 与 msw
// 提供，本仓不重新声明运行时语义。

// ===== 真实生成的 schema，按需命名 re-export =====

export type { CurrentUser } from "./model/currentUser";
export type { ErrorResponse } from "./model/errorResponse";
export type { ErrorResponseDetails } from "./model/errorResponseDetails";
export type {
  AdminTenantsListTenants200,
} from "./model/adminTenantsListTenants200";
export type {
  AdminTenantsListTenantsParams,
} from "./model/adminTenantsListTenantsParams";
export type {
  AdminClientsListClients200,
} from "./model/adminClientsListClients200";
export type {
  AdminClientsListClientsParams,
} from "./model/adminClientsListClientsParams";
export type { LoginRequest } from "./model/loginRequest";
export type { LoginResponse } from "./model/loginResponse";
export type {
  OAuthAuthorize200,
} from "./model/oAuthAuthorize200";
export type {
  OAuthClientPublicInfo,
} from "./model/oAuthClientPublicInfo";
export type {
  TenantStatus,
} from "./model/tenantStatus";
export type {
  SysUserStatus,
} from "./model/sysUserStatus";
export type {
  SysMenuType,
} from "./model/sysMenuType";
export type { TenantApplication } from "./model/tenantApplication";
export type {
  SubscribeTenantApplicationRequest,
} from "./model/subscribeTenantApplicationRequest";
export type {
  UpdateTenantApplicationRequest,
} from "./model/updateTenantApplicationRequest";
export type {
  TenantApplicationsListTenantApplications200,
} from "./model/tenantApplicationsListTenantApplications200";
export type {
  TenantApplicationsListTenantApplicationsParams,
} from "./model/tenantApplicationsListTenantApplicationsParams";

// ===== 9/7 前 src/pages 引用、本仓 orval 生成结构对不齐的 override =====

// Tenant：生成版字段是 id / tenantKey / name / status / createdAt / updatedAt；
// pages 用 id / code / name / status + 隐含 archived。需要带 archived。
export interface Tenant {
  id: string;
  /** @deprecated 9/7 后 shared OpenAPI 用 tenantKey；页代码未迁移 */
  code: string;
  name: string;
  status: "active" | "suspended" | "archived";
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateTenantRequest {
  code: string;
  name: string;
}
export interface UpdateTenantRequest {
  code?: string;
  name?: string;
  status?: "active" | "suspended" | "archived";
}

// User：生成版 SysUser 字段是 id / tenantId / clientId / userCode / displayName /
// email / status；pages 用 id / username / code / displayName / roleIds / status 等。
export interface User {
  id: string;
  username?: string;
  code: string;
  displayName: string;
  email?: string;
  status:
    | "active"
    | "suspended"
    | "archived"
    | "invited"
    | "disabled"
    | "revoked"
    | "expired";
  roleIds: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateUserRequest {
  code: string;
  displayName: string;
  email?: string;
  roleIds?: string[];
}
export interface UpdateUserRequest {
  displayName?: string;
  email?: string;
  status?: string;
  roleIds?: string[];
}

// Role：生成版 SysRole 是 roleCode/roleName；pages 用 code/name/permissionIds。
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  isPreset?: boolean;
  permissionIds: string[];
  status: "active" | "disabled";
}
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: string[];
}
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// Menu：生成版 SysMenu 字段是 menuCode/displayName；pages 用
// id/code/name/path/parentId/order/type/status/sortOrder/appId。
export interface Menu {
  id: string;
  code: string;
  name: string;
  path?: string;
  parentId?: string | null;
  order?: number;
  sortOrder: number;
  type?: "group" | "action" | "page";
  status?: "active" | "disabled";
  appId?: string;
}
export interface CreateMenuRequest {
  code: string;
  name: string;
  path?: string;
  parentId?: string | null;
  sortOrder?: number;
  type?: "group" | "action" | "page";
  status?: "active" | "disabled";
}
export interface UpdateMenuRequest {
  code?: string;
  name?: string;
  path?: string;
  parentId?: string | null;
  order?: number;
  sortOrder?: number;
  type?: "group" | "action" | "page";
  status?: "active" | "disabled";
}

// App：生成版 OAuthClientPublicInfo 是 clientId/clientName/status；
// pages 用 id/code/clientId/name/scopes/isFirstParty/sortOrder/icon/status。
export interface App {
  id: string;
  code: string;
  clientId: string;
  name: string;
  scopes: string[];
  isFirstParty: boolean;
  sortOrder: number;
  icon?: string;
  status: "active" | "disabled";
}
export interface CreateAppRequest {
  code: string;
  name: string;
  clientId?: string;
  scopes?: string[];
  redirectUris?: string[];
  grantTypes?: string[];
  icon?: string;
  sortOrder?: number;
  isFirstParty?: boolean;
  status?: "active" | "disabled";
}
export interface UpdateAppRequest {
  name?: string;
  scopes?: string[];
  redirectUris?: string[];
  icon?: string;
  sortOrder?: number;
  isFirstParty?: boolean;
  status?: "active" | "disabled";
}

// SetRoleMenusRequest：shared OpenAPI 暂无；按页代码形态定义。
export interface SetRoleMenusRequest {
  menuIds: string[];
  /** 与 setRoleMenus 一并存的元数据（页代码会回传 updatedAt） */
  updatedAt?: string;
}

// AuthorizeCodeRequest：生成版不收 tenantId，页代码传 tenantId。
// override 后允许 tenantId 透传到 OIDC authorize（多租户 OAuth 跳板）。
export interface AuthorizeCodeRequest {
  clientId: string;
  redirectUri: string;
  responseType: "code";
  scope?: string;
  state: string;
  /** 9/7 后页代码新增：登录后用户所属租户，OIDC authorize 透传给 RP */
  tenantId?: string;
}
