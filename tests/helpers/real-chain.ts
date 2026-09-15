// tests/helpers/real-chain.ts — 单测真链路基座（msw 剔除 Phase 2，Task 10 终态；
// lab-react T8/T9 同构）。
//
// msw 拦截层已全仓拆除（setup.ts 的 vi.mock 墙已拆）：jsdom 请求同源直连真
// nextjs :5101（jsdom url 与 baseUrl 同源——lab T7 实测：跨源 XHR 被吞成网络
// 错误）。本文件提供三件事：
//   1. `installRealChain()`：token 双通道（globalSetup provide("TEST_TOKEN") /
//      process.env，任一在即可）→ installHttpClient 拦截器（baseURL + Bearer）
//      + tenant-context 的 localStorage 契约 key（main.tsx bootstrap 在测试里
//      不跑，需自行接桥；user 字段必须有——persist() 见 user 为空会丢 session）。
//   2. 真链路延迟预算：RTL waitFor 统一 30s；vitest it 级 timeout 保持 config
//      默认 10s 不动（禁全文件放宽）——撞远程 PG 多 RTT / nextjs 冷编译的个别
//      it 由各文件显式传 { timeout } 放宽。
//   3. `SEED` 锚：saas-shared seeds/*.json（DB 快照权威源，globalSetup 每次跑前
//      TRUNCATE+全量重灌）。断言一律锚定种子行的固定 id/字段，不许断言易变业务值。
import { inject } from "vitest";
import { configure } from "@testing-library/react";

// globalSetup 双通道之一：provide("TEST_TOKEN", token) 的消费类型声明
declare module "vitest" {
  interface ProvidedContext {
    TEST_TOKEN: string;
  }
}

import tenantsSeedJson from "../../../saas-identity-platform-shared/seeds/tenant.json";
import usersSeedJson from "../../../saas-identity-platform-shared/seeds/sys_user.json";
import rolesSeedJson from "../../../saas-identity-platform-shared/seeds/sys_role.json";
import appsSeedJson from "../../../saas-identity-platform-shared/seeds/oauth_client.json";
import menusSeedJson from "../../../saas-identity-platform-shared/seeds/sys_menu.json";
import roleMenuSeedJson from "../../../saas-identity-platform-shared/seeds/sys_role_menu.json";

/** tenant-context 持久化键（src/state/tenant-context.tsx STORAGE_KEY）。 */
export const SESSION_STORAGE_KEY = "saas.tenant";

/**
 * 把当前测试文件切到真链路：
 *  - localStorage 契约 key 写回（afterEach 的 localStorage.clear() 之后重新写；
 *    axios 拦截器由 setup.ts 统一装一次——这里绝不重复 installHttpClient，
 *    那会叠拦截器链、旧闭包盖新 token（axios-interceptor-pileup 教训））；
 *  - RTL waitFor 预算放宽（真链路延迟：远程 PG 多 RTT + nextjs dev 惰性编译）。
 *
 * 每个 it 前调（beforeEach）。
 */
export function installRealChain(): void {
  configure({ asyncUtilTimeout: 30_000 });
  const token = testToken();
  if (!token) throw new Error("fail-fast: TEST_TOKEN 缺失——globalSetup 未运行？");
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      accessToken: token,
      refreshToken: token,
      // persist() 校验 user 存在才落盘（tenant-context.tsx:94）；给最小 user 形
      user: { id: SEED.users[0].id, username: SEED.users[0].username },
      currentTenantId: SEED.tenants[0].id,
    }),
  );
}

/** token 双通道：process.env（forks pool 继承）优先，回落 vitest inject。 */
export function testToken(): string {
  const fromEnv = process.env["TEST_TOKEN"];
  if (fromEnv) return fromEnv;
  try {
    const injected: unknown = inject("TEST_TOKEN");
    return typeof injected === "string" ? injected : "";
  } catch {
    return "";
  }
}

// ————————————————————————————————————————————————
// SEED 锚（saas-shared seeds/*.json，DB 快照权威源）
// ————————————————————————————————————————————————

export interface SeedTenantRow {
  id: string;
  tenantKey: string;
  name: string;
  status: string;
}

export interface SeedUserRow {
  id: string;
  username: string;
  status: string;
}

export interface SeedRoleRow {
  id: string;
  roleCode: string;
  tenantId: string;
}

export interface SeedAppRow {
  id: string;
  clientId: string;
  clientName: string;
  status: number;
}

export interface SeedMenuRow {
  id: string;
  clientId: string;
  parentId: string | null;
  title: string;
  path: string | null;
  type: string;
  sortOrder: number;
}

/** acme 租户的种子角色 id（roleCode 匹配；acme = seeds/tenant.json 首行）。 */
export function acmeRoleIdByCode(roleCode: string): string {
  const acmeId = SEED.tenants[0].id;
  const role = SEED.roles.find((r) => r.tenantId === acmeId && r.roleCode === roleCode);
  if (!role) throw new Error(`seeds 缺 acme 角色 ${roleCode}——种子契约漂移`);
  return role.id;
}

/** 按 clientId（code 形）过滤种子菜单。 */
export function menusByAppCode(appCode: string): SeedMenuRow[] {
  const app = SEED.apps.find((a) => a.clientId === appCode);
  if (!app) throw new Error(`seeds 缺应用 ${appCode}——种子契约漂移`);
  return SEED.menus.filter((m) => m.clientId === app.id);
}

/** acme admin 角色的种子授权菜单数（sys_role_menu.json）。 */
export function acmeAdminGrantCount(): number {
  const roleId = acmeRoleIdByCode("admin");
  const grant = SEED.roleMenus.find((g) => g.roleId === roleId);
  if (!grant) throw new Error("seeds 缺 acme admin 的 sys_role_menu 行——种子契约漂移");
  return grant.menuIds.length;
}

export const SEED = {
  tenants: tenantsSeedJson as SeedTenantRow[],
  users: usersSeedJson as SeedUserRow[],
  roles: rolesSeedJson as SeedRoleRow[],
  apps: appsSeedJson as SeedAppRow[],
  menus: menusSeedJson as SeedMenuRow[],
  roleMenus: roleMenuSeedJson as Array<{ roleId: string; tenantId: string; menuIds: string[] }>,
};
