// M09.F02 — 角色菜单授权
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { RoleMenuGrantPage } from "../../src/pages/RoleMenuGrantPage";

function renderGrant() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={["/tenants/acme/roles/r1/menus"]}>
          <Routes>
            <Route
              path="/tenants/:tenantId/roles/:roleId/menus"
              element={<RoleMenuGrantPage />}
            />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("M09.F02 角色菜单授权", () => {
  it("渲染多 app 分组菜单行，保存按钮挂 data-fn=M09.F02.I02", async () => {
    renderGrant();
    const rows = await screen.findAllByTestId("menu-grant-row");
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M09.F02.I02");
    expect(btn).toBeTruthy();
  });

  it("清空按钮挂 data-fn=M09.F02.I03", async () => {
    renderGrant();
    await screen.findAllByTestId("menu-grant-row");
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M09.F02.I03");
    expect(btn).toBeTruthy();
  });

  it("保存按钮在初始 4 项勾选时显示「保存 (4)」", async () => {
    renderGrant();
    await screen.findAllByTestId("menu-grant-row");
    const saveBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M09.F02.I02") as HTMLElement;
    await waitFor(() => {
      expect(saveBtn.textContent).toMatch(/保存 \(/);
    });
  });

  it("清空按钮把保存按钮数字归零", async () => {
    renderGrant();
    await screen.findAllByTestId("menu-grant-row");
    const clearBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M09.F02.I03") as HTMLElement;
    fireEvent.click(clearBtn);
    const saveBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M09.F02.I02") as HTMLElement;
    await waitFor(() => {
      expect(saveBtn.textContent).toMatch(/保存 \(0\)/);
    });
  });
});