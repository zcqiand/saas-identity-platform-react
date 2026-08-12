// 回归测试：sidebar 高亮必须唯一。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider, SelectionProvider, BackendProvider } from "../state-helpers";
import { AppShell } from "../../src/components/app/app-shell";
import { ApiKeyListPage } from "../../src/pages/ApiKeyListPage";
import { MenuTreePage } from "../../src/pages/MenuTreePage";

function renderApp(path: string) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <BackendProvider>
        <TenantProvider>
          <SelectionProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/apps/:appCode/menus" element={<MenuTreePage />} />
                  <Route path="/tenants/:tenantId/api-keys" element={<ApiKeyListPage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </SelectionProvider>
        </TenantProvider>
      </BackendProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("sidebar 选中态唯一性回归", () => {
  it("在 /tenants/{id}/api-keys 高亮「API Key」，「租户管理」不高亮", () => {
    renderApp("/tenants/00000000-0000-0000-0000-000000000001/api-keys");

    const apiKeyLink = screen.getByTestId("sidebar-nav-item-M05.F01.I01");
    const tenantLink = screen.getByTestId("sidebar-nav-item-M00.F01.I01");

    expect(apiKeyLink.className).toMatch(/bg-slate-700/);
    expect(tenantLink.className).not.toMatch(/bg-slate-700/);
  });

  it("在 /apps/{code}/menus 高亮「菜单管理」，「应用管理」不高亮", () => {
    renderApp("/apps/lab-management/menus");

    const menuLink = screen.getByTestId("sidebar-nav-item-M08.F01.I01");
    const appLink = screen.getByTestId("sidebar-nav-item-M04.F01.I01");

    expect(menuLink.className).toMatch(/bg-slate-700/);
    expect(appLink.className).not.toMatch(/bg-slate-700/);
  });

  it("整页只有一条 sidebar item 高亮 active 态", () => {
    renderApp("/tenants/00000000-0000-0000-0000-000000000001/api-keys");
    const items = document.querySelectorAll('[data-testid^="sidebar-nav-item-"]');
    const active = Array.from(items).filter((el) =>
      el.className.includes("bg-slate-700"),
    );
    expect(active.length).toBe(1);
    expect((active[0] as HTMLElement).getAttribute("data-fn")).toBe("M05.F01.I01");
  });
});