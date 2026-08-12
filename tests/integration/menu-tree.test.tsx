// M08.F01 — 菜单树（应用下）
// 应用切换器（与租户选择同构：localStorage 存 id+name）+ 默认 app-lab + reload 还原
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider, SelectionProvider } from "../state-helpers";
import { MenuTreePage } from "../../src/pages/MenuTreePage";

function renderWithProviders(initialPath = "/apps/lab-management/menus") {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <SelectionProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/apps/:appCode/menus" element={<MenuTreePage />} />
            </Routes>
          </MemoryRouter>
        </SelectionProvider>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("M08.F01 菜单树", () => {
  it("默认选中 app-lab，渲染 27 项菜单行 + 新建按钮 data-fn=M08.F01.I02", async () => {
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(27);
    expect(screen.getAllByText(/建筑工程实验室管理系统/).length).toBeGreaterThanOrEqual(1);
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M08.F01.I02");
    expect(btn).toBeTruthy();
  });

  it("应用切换器存在", async () => {
    renderWithProviders();
    await screen.findAllByTestId("menu-row");
    expect(screen.getByTestId("app-selector-trigger")).toBeTruthy();
  });

  it("切到 app-erp 后渲染 7 项菜单", async () => {
    localStorage.setItem(
      "saas.selected.app",
      JSON.stringify({ id: "app-erp", name: "企业资源计划系统" }),
    );
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(7);
    expect(screen.getAllByText(/企业资源计划系统/).length).toBeGreaterThanOrEqual(1);
    const rowText = rows.map((r) => r.textContent).join("|");
    expect(rowText).toMatch(/采购管理/);
    expect(rowText).toMatch(/系统设置/);
  });

  it("切到 app-crm 后渲染 7 项菜单", async () => {
    localStorage.setItem(
      "saas.selected.app",
      JSON.stringify({ id: "app-crm", name: "客户关系管理系统" }),
    );
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(7);
    expect(screen.getAllByText(/客户关系管理系统/).length).toBeGreaterThanOrEqual(1);
    const rowText = rows.map((r) => r.textContent).join("|");
    expect(rowText).toMatch(/客户管理/);
    expect(rowText).toMatch(/销售线索/);
    expect(rowText).toMatch(/商机管理/);
    expect(rowText).toMatch(/销售报表/);
  });

  it("reload 后从 localStorage 还原选中应用", async () => {
    localStorage.setItem(
      "saas.selected.app",
      JSON.stringify({ id: "app-crm", name: "客户关系管理系统" }),
    );
    renderWithProviders();
    const rows = await screen.findAllByTestId("menu-row");
    expect(rows.length).toBe(7);
  });

  it("菜单行挂 data-fn=M08.F01.I05 删除按钮（每个菜单 1 个）", async () => {
    renderWithProviders();
    await screen.findAllByTestId("menu-row");
    const btns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-fn") === "M08.F01.I05");
    expect(btns.length).toBe(27);
  });
});