// M02.F01 — tenant-scoped 角色列表
// Phase 2 真化：直连真 nextjs :5101（JWT tenant_id 与路径 :tenantId 一致才放行），
// 断言锚 saas-shared seeds/sys_role.json（acme: admin/member）。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RoleListPage } from "../../src/pages/RoleListPage";
import { installRealChain, SEED, acmeRoleIdByCode } from "../helpers/real-chain";

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

describe("M02.F01 角色权限（tenant-scoped）", () => {
  it("渲染角色列表，新建角色按钮挂 data-fn=M00.F03.I02", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/tenants/${SEED.tenants[0].id}/roles`]}>
          <Routes>
            <Route path="/tenants/:tenantId/roles" element={<RoleListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    // 种子：acme 有 admin / member 两个角色，行渲染 roleCode
    await screen.findAllByTestId("role-row");
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M00.F03.I02");
    expect(btn).toBeTruthy();
  });

  it("渲染种子角色 admin / member 行（真数据锚）", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[`/tenants/${SEED.tenants[0].id}/roles`]}>
          <Routes>
            <Route path="/tenants/:tenantId/roles" element={<RoleListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const rows = await screen.findAllByTestId("role-row");
    expect(rows.length).toBe(2);
    // 行 id 与种子对齐（菜单授权链接按种子 roleId 寻址）
    const rowText = rows.map((r) => r.textContent).join("|");
    expect(rowText).toContain("admin");
    expect(rowText).toContain("member");
    const grantLink = rows
      .find((r) => r.textContent?.includes("admin"))!
      .querySelector('a[href*="' + acmeRoleIdByCode("admin") + '"]');
    expect(grantLink).toBeTruthy();
  });
});
