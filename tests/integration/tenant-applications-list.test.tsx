// M00.F05 — tenant-scoped 应用订阅列表（CRUD + 状态切换）
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantApplicationsListPage } from "../../src/pages/TenantApplicationsListPage";
import { TenantProvider, SelectionProvider } from "../state-helpers";

beforeEach(() => {
  localStorage.clear();
});

function renderPage(initialPath = "/tenants/abc/applications") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <SelectionProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route
                path="/tenants/:tenantId/applications"
                element={<TenantApplicationsListPage />}
              />
            </Routes>
          </MemoryRouter>
        </SelectionProvider>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

describe("M00.F05 租户应用", () => {
  it("渲染租户应用页，订阅应用按钮挂 data-fn=M00.F05.I02", async () => {
    renderPage();
    const btn = await screen.findByRole("button", { name: "订阅应用" });
    expect(btn.getAttribute("data-fn")).toBe("M00.F05.I02");
  });

  it("空列表显示 EmptyState", async () => {
    renderPage();
    const empty = await screen.findByText(/还没有订阅应用/);
    expect(empty).toBeTruthy();
  });

  it("打开订阅对话框、填 clientId 提交", async () => {
    renderPage();
    const open = await screen.findByRole("button", { name: "订阅应用" });
    fireEvent.click(open);
    const clientInput = await screen.findByLabelText(/Client ID/);
    fireEvent.change(clientInput, { target: { value: "lab-management" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    expect(await screen.findByText(/还没有订阅应用/)).toBeTruthy();
  });
});
