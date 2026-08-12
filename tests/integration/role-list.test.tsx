// M02.F01 — tenant-scoped 角色列表
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RoleListPage } from "../../src/pages/RoleListPage";

beforeEach(() => {
  localStorage.clear();
});

describe("M02.F01 角色权限（tenant-scoped）", () => {
  it("渲染角色列表，新建角色按钮挂 data-fn=M02.F01.I02", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/tenants/abc/roles"]}>
          <Routes>
            <Route path="/tenants/:tenantId/roles" element={<RoleListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const btn = await screen
      .findAllByRole("button")
      .then((btns) => btns.find((b) => b.getAttribute("data-fn") === "M02.F01.I02"));
    expect(btn).toBeTruthy();
  });
});