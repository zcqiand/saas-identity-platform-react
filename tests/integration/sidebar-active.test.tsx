// 回归测试：sidebar 高亮必须唯一。
// 处置矩阵「保留 spy 模式」：纯 UI 逻辑测试，axios.get 本地打桩（非 msw），
// 桩数据源 = saas-shared seeds（原 setup.ts mock 墙的 fixtures 替换）。
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TenantProvider, SelectionProvider } from "../state-helpers";
import { AppShell } from "../../src/components/app/app-shell";
import { MenuTreePage } from "../../src/pages/MenuTreePage";
import { installRealChain, SEED, menusByAppCode } from "../helpers/real-chain";

// 页面/壳需要的只读端点全部本地打桩，数据来自 shared seeds：
//   GET /api/v1/admin/tenants        → Page<Tenant>（面包屑 + 租户切换器字典）
//   GET /api/v1/me/tenants           → TenantMember[]（租户切换器成员关系）
//   GET /api/v1/admin/clients        → Page<OAuthClient>（菜单树应用列表）
//   GET /api/v1/clients/{code}/menus → SysMenu[]（菜单树）
function stubAxiosGetWithSeeds(): void {
  vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/v1/admin/tenants")) {
      return {
        data: {
          items: SEED.tenants,
          page: 1,
          pageSize: SEED.tenants.length,
          total: SEED.tenants.length,
        },
      };
    }
    if (u.includes("/api/v1/me/tenants")) {
      return { data: [] };
    }
    if (u.includes("/api/v1/admin/clients")) {
      return {
        data: { items: SEED.apps, page: 1, pageSize: SEED.apps.length, total: SEED.apps.length },
      };
    }
    const menusMatch = u.match(/\/api\/v1\/clients\/([^/]+)\/menus/);
    if (menusMatch) {
      return { data: menusByAppCode(decodeURIComponent(menusMatch[1])) };
    }
    throw new Error(`sidebar-active spy: 未声明的 GET ${u}`);
  });
}

function renderApp(path: string) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <SelectionProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/apps/:appCode/menus" element={<MenuTreePage />} />
              </Route>
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
  stubAxiosGetWithSeeds();
});

describe("sidebar 选中态唯一性回归", () => {
  it("在 /apps/{code}/menus 高亮「菜单管理」，「应用管理」不高亮", () => {
    renderApp("/apps/lab-management/menus");

    const menuLink = screen.getByTestId("sidebar-nav-item-M04.F04.I01");
    const appLink = screen.getByTestId("sidebar-nav-item-M04.F01.I01");

    expect(menuLink.className).toMatch(/bg-slate-700/);
    expect(appLink.className).not.toMatch(/bg-slate-700/);
  });

  it("整页只有一条 sidebar item 高亮 active 态", () => {
    renderApp("/apps/lab-management/menus");
    const items = document.querySelectorAll('[data-testid^="sidebar-nav-item-"]');
    const active = Array.from(items).filter((el) => el.className.includes("bg-slate-700"));
    expect(active.length).toBe(1);
    expect((active[0] as HTMLElement).getAttribute("data-fn")).toBe("M04.F04.I01");
  });
});
