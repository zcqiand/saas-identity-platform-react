// M02.F01 — tenant-scoped 角色列表
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RoleListPage } from "../../src/pages/RoleListPage";

describe("M02.F01 角色权限（tenant-scoped）", () => {
  it("渲染角色列表，新建角色按钮挂 data-fn=M02.F01.I02", () => {
    render(
      <MemoryRouter initialEntries={["/tenants/abc/roles"]}>
        <Routes>
          <Route path="/tenants/:tenantId/roles" element={<RoleListPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M02.F01.I02");
    expect(btn).toBeTruthy();
  });
});
