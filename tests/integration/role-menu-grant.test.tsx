// M09.F02 — 角色菜单授权
// Phase 2 真化：直连真 nextjs :5101。种子锚：acme admin 角色的 sys_role_menu
// 授权 27 项（初始勾选数），跨 app 分组渲染全部 41 项种子菜单。
//
// 隔离纪律（T10-R1②，对齐 lab T8「TEST- 行承载、不碰种子行」）：写路径不再
// 改种子 admin 角色的授权集再回写——改为 beforeEach 用真 API 造 TEST- 前缀
// 临时角色（POST /api/v1/tenants/:tenantId/roles），并把 acme admin 的种子授
// 权集灌进临时角色（只写 TEST- 行），驱动授权页；afterEach 按前缀 DELETE 清
// 扫本租户全部 TEST- 角色（role 删除级联清 sys_role_menu，见 shared schema
// onDelete:"cascade"），全程零触碰种子行。
//
// 超时放宽说明（per-it / per-hook 显式放宽，非全局放宽）：本页一次渲染 = 6+
// 真实 HTTP 往返（tenant + clients + 4×client menus + grant），实测 5-8.5s；
// CI 冷机上端点首次编译也落在先跑的用例上（lab-react reportNameList 60s 同款
// 先例）。beforeEach 承担 roles POST/PUT 路由的冷编译，给 60s；写路径用例
// 另含 PUT 路由读回，给 60s。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TenantProvider } from "../state-helpers";
import { RoleMenuGrantPage } from "../../src/pages/RoleMenuGrantPage";
import {
  installRealChain,
  SEED,
  testToken,
  acmeRoleIdByCode,
  acmeAdminGrantCount,
  menusByAppCode,
} from "../helpers/real-chain";

const TENANT_ID = SEED.tenants[0].id;
const APP_CODE = "lab-management";
const ROLES_PATH = `/api/v1/tenants/${TENANT_ID}/roles`;
const ROLE_CODE_PREFIX = "TEST-";

/** beforeEach 造的临时角色 id，本文件用例串行消费（vitest 文件内顺序执行）。 */
let testRoleId = "";

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${testToken()}`,
});

const seedGrant = (): string[] => {
  const adminRoleId = acmeRoleIdByCode("admin");
  const grant = SEED.roleMenus.find((g) => g.roleId === adminRoleId);
  if (!grant) throw new Error("seeds 缺 acme admin 的 sys_role_menu 行——种子契约漂移");
  return [...grant.menuIds];
};

/** 真 API 造 TEST- 前缀临时角色（roleCode 带随机尾，避开唯一键与残留行）。 */
async function createTestRole(): Promise<string> {
  const res = await axios.post<{ id: string }>(
    ROLES_PATH,
    {
      clientId: APP_CODE,
      roleCode: `${ROLE_CODE_PREFIX}${Math.random().toString(36).slice(2, 10)}`,
      roleName: "P2 授权页临时角色",
    },
    { headers: authHeaders() },
  );
  if (!res.data?.id)
    throw new Error(`造 TEST- 角色失败：POST ${ROLES_PATH} 无 id（${res.status}）`);
  return res.data.id;
}

/** 按前缀清扫本租户全部 TEST- 角色（幂等；连上次失败遗留的一并清）。 */
async function purgeTestRoles(): Promise<void> {
  const res = await axios.get<{ items: Array<{ id: string; roleCode: string }> }>(ROLES_PATH, {
    headers: authHeaders(),
    params: { page: 0, pageSize: 100 },
  });
  for (const role of res.data.items) {
    if (role.roleCode.startsWith(ROLE_CODE_PREFIX)) {
      await axios.delete(`${ROLES_PATH}/${role.id}`, { headers: authHeaders() });
    }
  }
}

beforeEach(async () => {
  localStorage.clear();
  installRealChain();
  testRoleId = await createTestRole();
  // 把 acme admin 的种子授权集灌进临时角色（只写 TEST- 行）：授权页初始勾选
  // 数断言继续锚种子契约值（acmeAdminGrantCount），而状态承载不借种子角色
  await axios.put(
    `/api/v1/tenants/${TENANT_ID}/roles/${testRoleId}/menus`,
    { menuIds: seedGrant() },
    { headers: authHeaders(), params: { clientId: "" } },
  );
}, 60_000);

// TEST- 行清扫：失败不掩盖用例结果——TEST- 行只污染 scratch 库，globalSetup
// 下轮 TRUNCATE+重灌自愈
afterEach(async () => {
  try {
    await purgeTestRoles();
  } catch (e) {
    console.warn("[role-menu-grant] TEST- 角色清扫失败（下轮重灌自愈）", e);
  }
});

function renderGrant() {
  const roleId = testRoleId;
  if (!roleId) throw new Error("fail-fast: TEST- 角色 id 缺失——beforeEach 造角失败？");
  const grantPath = `/api/v1/tenants/${TENANT_ID}/roles/${roleId}/menus`;
  const qc = new QueryClient();
  const utils = render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={[`/tenants/${TENANT_ID}/roles/${roleId}/menus`]}>
          <Routes>
            <Route path="/tenants/:tenantId/roles/:roleId/menus" element={<RoleMenuGrantPage />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
  return { utils, grantPath };
}

const saveBtn = () =>
  screen
    .getAllByRole("button")
    .find((b) => b.getAttribute("data-fn") === "M00.F04.I03") as HTMLElement;

describe("M09.F02 角色菜单授权", () => {
  it("渲染多 app 分组菜单行，保存按钮挂 data-fn=M00.F04.I03", async () => {
    renderGrant();
    const rows = await screen.findAllByTestId("menu-grant-row");
    expect(rows.length).toBe(SEED.menus.length);
    expect(saveBtn().getAttribute("data-fn")).toBe("M00.F04.I03");
  }, 30_000);

  it("清空按钮挂 data-fn=M00.F04.I04", async () => {
    renderGrant();
    await screen.findAllByTestId("menu-grant-row");
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M00.F04.I04");
    expect(btn).toBeTruthy();
  }, 30_000);

  it("保存按钮初始显示预灌授权数「保存 (N)」（锚种子授权集规模）", async () => {
    renderGrant();
    await screen.findAllByTestId("menu-grant-row");
    await waitFor(() => {
      expect(saveBtn().textContent).toBe(`保存 (${acmeAdminGrantCount()})`);
    });
  }, 30_000);

  it("清空按钮把保存按钮数字归零", async () => {
    renderGrant();
    await screen.findAllByTestId("menu-grant-row");
    const clearBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M00.F04.I04") as HTMLElement;
    fireEvent.click(clearBtn);
    await waitFor(() => {
      expect(saveBtn().textContent).toBe("保存 (0)");
    });
  }, 30_000);

  it("勾选未授权菜单后保存：真 PUT 落库（读回验证，TEST- 行承载）", async () => {
    const { grantPath } = renderGrant();
    // 目标：erp 下一个不在预灌授权集里的菜单
    const grant = seedGrant();
    const target = menusByAppCode("erp").find((m) => !grant.includes(m.id));
    expect(target).toBeTruthy();
    await screen.findAllByTestId("menu-grant-row");
    await waitFor(() => {
      expect(saveBtn().textContent).toBe(`保存 (${grant.length})`);
    });
    // 点目标行的 checkbox。行内按 title 定位不行——种子三个 app 各有一个
    // 同名「仪表盘」（title+path 全同），getAllByTestId 会命中 lab-management
    // 那行（已授权，点击反而 -1）。先把 DOM 走到目标 app 的 Card 内再找行，
    // Card 内 title 唯一。
    const erpTitle = await screen.findByText("(erp)");
    let card: HTMLElement | null = erpTitle;
    while (card && !card.querySelector('[data-testid="menu-grant-row"]')) {
      card = card.parentElement;
    }
    expect(card).toBeTruthy();
    const row = [...card!.querySelectorAll('[data-testid="menu-grant-row"]')].find((r) =>
      r.textContent?.includes(target!.title),
    )!;
    fireEvent.click(row.querySelector('input[type="checkbox"]')!);
    await waitFor(() => {
      expect(saveBtn().textContent).toBe(`保存 (${grant.length + 1})`);
    });
    fireEvent.click(saveBtn());
    // 真 PUT 后读回：授权集含目标菜单（PUT 路由冷编译实测可达 20s+，轮询窗口给足）
    await waitFor(
      async () => {
        const res = await axios.get<{ menuIds: string[] }>(grantPath, {
          headers: authHeaders(),
          params: { clientId: "" },
        });
        expect(res.data.menuIds).toContain(target!.id);
        expect(res.data.menuIds.length).toBe(grant.length + 1);
      },
      { timeout: 45_000 },
    );
  }, 60_000);
});
