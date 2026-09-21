// M08.F01 — 菜单树（应用下）
// 应用切换器（与租户选择同构：localStorage 存 id+name）+ 默认 lab-management + reload 还原
// Phase 2 真化：直连真 nextjs :5101，断言锚 saas-shared seeds/sys_menu.json
// （lab-management 27 项 / erp 7 项 / crm 7 项，按 parentId 构树）。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider, SelectionProvider } from "../state-helpers";
import { MenuTreePage } from "../../src/pages/MenuTreePage";
import { installRealChain, SEED, menusByAppCode } from "../helpers/real-chain";

function renderWithProviders(initialPath = "/admin/clients/lab-management/menus") {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <SelectionProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/admin/clients/:clientId/menus" element={<MenuTreePage />} />
            </Routes>
          </MemoryRouter>
        </SelectionProvider>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

describe("M08.F01 菜单树", () => {
  it("默认选中 lab-management，渲染种子全部菜单行 + 新建按钮 data-fn=M04.F04.I02", async () => {
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(menusByAppCode("lab-management").length);
    expect(screen.getAllByText(/建筑工程实验室管理系统/).length).toBeGreaterThanOrEqual(1);
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M04.F04.I02");
    expect(btn).toBeTruthy();
  });

  it("应用切换器存在", async () => {
    renderWithProviders();
    await screen.findAllByTestId("menu-row");
    expect(screen.getByTestId("app-selector-trigger")).toBeTruthy();
  });

  it("切到 erp 后渲染 7 项菜单", async () => {
    // selection-context 按 code 持久化（DEFAULT_APP_ID="lab-management" 是 code,oauth_client.client_id 是 code 形）
    const erp = SEED.apps.find((a) => a.clientId === "erp")!;
    localStorage.setItem(
      "saas.selected.app",
      JSON.stringify({ id: erp.clientId, name: erp.clientName }),
    );
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(menusByAppCode("erp").length);
    expect(screen.getAllByText(/企业资源计划系统/).length).toBeGreaterThanOrEqual(1);
    const rowText = rows.map((r) => r.textContent).join("|");
    expect(rowText).toMatch(/采购管理/);
    expect(rowText).toMatch(/系统设置/);
  });

  it("切到 crm 后渲染 7 项菜单", async () => {
    const crm = SEED.apps.find((a) => a.clientId === "crm")!;
    localStorage.setItem(
      "saas.selected.app",
      JSON.stringify({ id: crm.clientId, name: crm.clientName }),
    );
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(menusByAppCode("crm").length);
    expect(screen.getAllByText(/客户关系管理系统/).length).toBeGreaterThanOrEqual(1);
    const rowText = rows.map((r) => r.textContent).join("|");
    expect(rowText).toMatch(/客户管理/);
    expect(rowText).toMatch(/销售线索/);
    expect(rowText).toMatch(/商机管理/);
    expect(rowText).toMatch(/销售报表/);
  });

  it("reload 后从 localStorage 还原选中应用", async () => {
    const crm = SEED.apps.find((a) => a.clientId === "crm")!;
    localStorage.setItem(
      "saas.selected.app",
      JSON.stringify({ id: crm.clientId, name: crm.clientName }),
    );
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(menusByAppCode("crm").length);
  });

  it("菜单行挂 data-fn=M04.F04.I05 删除按钮（每个菜单 1 个）", async () => {
    renderWithProviders();
    await screen.findAllByTestId("menu-row");
    const btns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-fn") === "M04.F04.I05");
    expect(btns.length).toBe(menusByAppCode("lab-management").length);
  });

  it("父级菜单行带 data-testid=menu-toggle-* 切换按钮", async () => {
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(menusByAppCode("lab-management").length);
    const toggles = screen.queryAllByTestId(/^menu-toggle-/);
    expect(toggles.length).toBeGreaterThan(0);
  });

  it("点击父级切换按钮后子级行数减少", async () => {
    renderWithProviders();
    const before = (await screen.findAllByTestId("menu-row")).length;
    expect(before).toBe(menusByAppCode("lab-management").length);
    const firstToggle = screen.getAllByTestId(/^menu-toggle-/)[0];
    await firstToggle.click();
    const after = (await screen.findAllByTestId("menu-row")).length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it("至少一行带 data-depth > 0（证明真的按 parentId 构树）", async () => {
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    const nested = rows.filter((r) => Number(r.getAttribute("data-depth")) > 0);
    expect(nested.length).toBeGreaterThan(0);
  });
});
