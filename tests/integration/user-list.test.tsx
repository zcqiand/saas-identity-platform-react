// M01.F01 — tenant-scoped 用户列表
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserListPage } from "../../src/pages/UserListPage";

describe("M01.F01 用户管理（tenant-scoped）", () => {
  it("渲染用户列表，邀请按钮挂 data-fn=M01.F01.I02", () => {
    render(
      <MemoryRouter initialEntries={["/tenants/abc/users"]}>
        <Routes>
          <Route path="/tenants/:tenantId/users" element={<UserListPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const inviteBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M01.F01.I02");
    expect(inviteBtn).toBeTruthy();
    expect(screen.getAllByTestId("user-row").length).toBeGreaterThan(0);
  });
});
