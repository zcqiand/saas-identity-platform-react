// M01.F01 — tenant-scoped 用户列表
// Phase 2 真化：直连真 nextjs :5101（JWT tenant_id=acme 与路径 :tenantId 同源），
// 断言锚 saas-shared seeds（acme 的成员 alice/bob/carol）。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { UserListPage } from "../../src/pages/UserListPage";
import { installRealChain, SEED } from "../helpers/real-chain";

function renderUserList() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={[`/tenants/${SEED.tenants[0].id}/members`]}>
          <Routes>
            <Route path="/tenants/:tenantId/members" element={<UserListPage />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

describe("M01.F01 用户管理（tenant-scoped）", () => {
  it("渲染用户列表，邀请按钮挂 data-fn=M01.F04.I03", async () => {
    renderUserList();
    const rows = await screen.findAllByTestId("user-row");
    // 种子：acme 有 3 名成员（alice/bob/carol）
    expect(rows.length).toBe(
      SEED.users.filter((u) => ["alice", "bob", "carol"].includes(u.username)).length,
    );
    const inviteBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M01.F04.I03");
    expect(inviteBtn).toBeTruthy();
  });

  it("展示分配角色 / 编辑 / 删除按钮（无图标）", async () => {
    renderUserList();
    await screen.findAllByTestId("user-row");
    expect(screen.getAllByText("分配角色").length).toBeGreaterThan(0);
    expect(screen.getAllByText("编辑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("删除").length).toBeGreaterThan(0);
  });

  it("渲染种子成员 alice 的用户名行（真数据锚）", async () => {
    renderUserList();
    await screen.findAllByTestId("user-row");
    expect(screen.getAllByText(SEED.users[0].username).length).toBeGreaterThan(0);
  });
});
