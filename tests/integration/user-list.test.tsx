// M01.F01 — tenant-scoped 用户列表
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { UserListPage } from "../../src/pages/UserListPage";

function renderUserList() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={["/tenants/acme/users"]}>
          <Routes>
            <Route path="/tenants/:tenantId/users" element={<UserListPage />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("M01.F01 用户管理（tenant-scoped）", () => {
  it("渲染用户列表，邀请按钮挂 data-fn=M01.F01.I02", async () => {
    renderUserList();
    const rows = await screen.findAllByTestId("user-row");
    expect(rows.length).toBeGreaterThan(0);
    const inviteBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M01.F01.I02");
    expect(inviteBtn).toBeTruthy();
  });

  it("展示分配角色 / 编辑 / 删除按钮（无图标）", async () => {
    renderUserList();
    await screen.findAllByTestId("user-row");
    expect(screen.getAllByText("分配角色").length).toBeGreaterThan(0);
    expect(screen.getAllByText("编辑").length).toBeGreaterThan(0);
    expect(screen.getAllByText("删除").length).toBeGreaterThan(0);
  });
});