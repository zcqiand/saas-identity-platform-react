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


// 2026-09-11 B 扫尾（用户裁定）：legacy 手写 shadow/死桩层整体删除 ——
// 同名空实现遮蔽 per-tag 真源（TS 后定义优先），是「单测全绿、页面空白」的根因。
// 页面一律直接 import 真源 tag 模块（admin-tenants/admin-clients/client-menus/
// tenant-members/tenant-roles/tenant-role-menus/tenant-applications/me/oauth/auth/clients）。
// 禁止再在本文件新增任何手写函数；新增 API 改 shared tsp → orval 重生。