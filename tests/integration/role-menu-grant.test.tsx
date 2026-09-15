// M09.F02 — 角色菜单授权
// Phase 2 真化：直连真 nextjs :5101。种子锚：acme admin 角色的 sys_role_menu
// 授权 27 项（初始勾选数），跨 app 分组渲染全部 41 项种子菜单。
// 写路径走真 PUT；afterEach 用种子原始授权集回写（隔离纪律：不留状态；
// 即便回写失败，globalSetup 每轮 TRUNCATE+重灌也自愈）。
//
// 超时放宽说明（per-it 显式放宽，非全局放宽）：本页一次渲染 = 6+ 真实 HTTP
// 往返（tenant + clients + 4×client menus + grant），实测 5-8.5s；CI 冷机上
// 端点首次编译也落在先跑的用例上（lab-react reportNameList 60s 同款先例）。
// 写路径用例另含 PUT 路由冷编译，给 60s。
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
const ROLE_ID = acmeRoleIdByCode("admin");
const GRANT_PATH = `/api/v1/tenants/${TENANT_ID}/roles/${ROLE_ID}/menus`;

const seedGrant = (): string[] => {
  const grant = SEED.roleMenus.find((g) => g.roleId === ROLE_ID);
  if (!grant) throw new Error("seeds 缺 acme admin 的 sys_role_menu 行——种子契约漂移");
  return [...grant.menuIds];
};

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

// 写路径隔离：把 acme admin 的授权回写为种子原始集（幂等）
afterEach(async () => {
  try {
    await axios.put(
      GRANT_PATH,
      { menuIds: seedGrant() },
      { headers: { Authorization: `Bearer ${testToken()}` }, params: { clientId: "" } },
    );
  } catch {
    /* 回写失败不掩盖用例结果；globalSetup 下轮重灌自愈 */
  }
});

function renderGrant() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={[`/tenants/${TENANT_ID}/roles/${ROLE_ID}/menus`]}>
          <Routes>
            <Route path="/tenants/:tenantId/roles/:roleId/menus" element={<RoleMenuGrantPage />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
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

  it("保存按钮初始显示种子授权数「保存 (N)」", async () => {
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

  it("勾选未授权菜单后保存：真 PUT 落库（afterEach 回写种子授权集）", async () => {
    // 目标：erp 下一个不在 admin 授权集里的菜单
    const grant = seedGrant();
    const target = menusByAppCode("erp").find((m) => !grant.includes(m.id));
    expect(target).toBeTruthy();
    renderGrant();
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
        const res = await axios.get<{ menuIds: string[] }>(GRANT_PATH, {
          headers: { Authorization: `Bearer ${testToken()}` },
          params: { clientId: "" },
        });
        expect(res.data.menuIds).toContain(target!.id);
        expect(res.data.menuIds.length).toBe(grant.length + 1);
      },
      { timeout: 45_000 },
    );
  }, 60_000);
});
