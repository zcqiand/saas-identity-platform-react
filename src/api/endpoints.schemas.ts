// schemas barrel — 纯 re-export 桶（Phase C4 2026-09-17：手写 override 全删）。
//
// orval tags-split 把所有 schema 拆到 model/ 子目录；本文件只做命名 re-export
// 减 import 噪音。桶内零手写 interface——页面/状态/测试一律消费生成类型，
// 字段名以生成物为准（运行时真相 = saas-nextjs :5101，契约 1:1）。
// 旧 msw 时代 override（Tenant.code / User.displayName / Role.permissionIds /
// Menu.group 等）已随消费方迁移删除；新需求字段不在契约里 → 列 GAP 停下问人，
// 不在本桶发明形状。

// ===== 会话 / OAuth =====
export type { LoginRequest } from "./endpoints/model/loginRequest";
export type { LoginResponse } from "./endpoints/model/loginResponse";
export type { CurrentUser } from "./endpoints/model/currentUser";
export type { OAuthAuthorize200 } from "./endpoints/model/oAuthAuthorize200";
export type { OAuthClientPublicInfo } from "./endpoints/model/oAuthClientPublicInfo";
export type { OAuthClient } from "./endpoints/model/oAuthClient";
export type { CreateOAuthClientRequest } from "./endpoints/model/createOAuthClientRequest";
export type { UpdateOAuthClientRequest } from "./endpoints/model/updateOAuthClientRequest";
export type { AuthorizeCodeRequest } from "./endpoints/model/authorizeCodeRequest";
export type { TokenRequest } from "./endpoints/model/tokenRequest";
export type { TokenResponse } from "./endpoints/model/tokenResponse";

// ===== 错误 =====
export type { ErrorResponse } from "./endpoints/model/errorResponse";
export type { ErrorResponseDetails } from "./endpoints/model/errorResponseDetails";

// ===== 租户 =====
export type { Tenant } from "./endpoints/model/tenant";
export type { TenantStatus } from "./endpoints/model/tenantStatus";
export type { CreateTenantRequest } from "./endpoints/model/createTenantRequest";
export type { UpdateTenantRequest } from "./endpoints/model/updateTenantRequest";
export type { AdminTenantsListTenants200 } from "./endpoints/model/adminTenantsListTenants200";
export type { AdminTenantsListTenantsParams } from "./endpoints/model/adminTenantsListTenantsParams";

// ===== 用户 / 成员 =====
export type { SysUser } from "./endpoints/model/sysUser";
export type { SysUserStatus } from "./endpoints/model/sysUserStatus";
export type { CreateSysUserRequest } from "./endpoints/model/createSysUserRequest";
export type { UpdateSysUserRequest } from "./endpoints/model/updateSysUserRequest";
export type { TenantMember } from "./endpoints/model/tenantMember";
export type { TenantMemberStatus } from "./endpoints/model/tenantMemberStatus";
export type { TenantMemberView } from "./endpoints/model/tenantMemberView";
export type { TenantMemberUserView } from "./endpoints/model/tenantMemberUserView";
export type { TenantMembersListTenantUsers200 } from "./endpoints/model/tenantMembersListTenantUsers200";
export type { TenantMembersListTenantUsersParams } from "./endpoints/model/tenantMembersListTenantUsersParams";
export type { TenantMembersInviteTenantUserBody } from "./endpoints/model/tenantMembersInviteTenantUserBody";
export type { TenantMembersChangeTenantUserStatusBody } from "./endpoints/model/tenantMembersChangeTenantUserStatusBody";
export type { SetTenantMemberRolesRequest } from "./endpoints/model/setTenantMemberRolesRequest";

// ===== 角色 =====
export type { SysRole } from "./endpoints/model/sysRole";
export type { CreateSysRoleRequest } from "./endpoints/model/createSysRoleRequest";
export type { UpdateSysRoleRequest } from "./endpoints/model/updateSysRoleRequest";
export type { SetSysRoleMenusRequest } from "./endpoints/model/setSysRoleMenusRequest";
export type { RoleMenuGrant } from "./endpoints/model/roleMenuGrant";
export type { TenantRolesListSysRoles200 } from "./endpoints/model/tenantRolesListSysRoles200";
export type { TenantRolesListSysRolesParams } from "./endpoints/model/tenantRolesListSysRolesParams";

// ===== 菜单 =====
export type { SysMenu } from "./endpoints/model/sysMenu";
export type { SysMenuType } from "./endpoints/model/sysMenuType";
export type { CreateSysMenuRequest } from "./endpoints/model/createSysMenuRequest";
export type { UpdateSysMenuRequest } from "./endpoints/model/updateSysMenuRequest";
export type { ReorderSysMenuRequest } from "./endpoints/model/reorderSysMenuRequest";
export type { EffectiveMenuNode } from "./endpoints/model/effectiveMenuNode";

// ===== client（应用）=====
export type { AdminClientsListClients200 } from "./endpoints/model/adminClientsListClients200";
export type { AdminClientsListClientsParams } from "./endpoints/model/adminClientsListClientsParams";

// ===== 租户应用订阅 =====
export type { TenantApplication } from "./endpoints/model/tenantApplication";
export type { SubscribeTenantApplicationRequest } from "./endpoints/model/subscribeTenantApplicationRequest";
export type { UpdateTenantApplicationRequest } from "./endpoints/model/updateTenantApplicationRequest";
export type { TenantApplicationsListTenantApplications200 } from "./endpoints/model/tenantApplicationsListTenantApplications200";
export type { TenantApplicationsListTenantApplicationsParams } from "./endpoints/model/tenantApplicationsListTenantApplicationsParams";
