// M04.F01 — 应用列表（平台级；apps 同时承载菜单 + OAuth client）
// Phase 2 真化：直连真 nextjs :5101，断言锚 saas-shared seeds/oauth_client.json
// （lab-management / erp / crm / saas-console 四应用）。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppListPage } from "../../src/pages/AppListPage";
import { installRealChain, SEED } from "../helpers/real-chain";

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

function renderApp() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/clients"]}>
        <Routes>
          <Route path="/admin/clients" element={<AppListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("M04.F01 应用列表（平台级）", () => {
  it("渲染 4 个应用行，新建按钮挂 data-fn=M04.F01.I02", async () => {
    renderApp();
    const rows = await screen.findAllByTestId("app-row");
    expect(rows.length).toBe(SEED.apps.length);
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M04.F01.I02");
    expect(btn).toBeTruthy();
  });

  it("应用行挂 data-fn=M04.F02.I01 启用/停用按钮", async () => {
    renderApp();
    await screen.findAllByTestId("app-row");
    const btns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-fn") === "M04.F02.I01");
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it("应用行挂 data-fn=M04.F01.I05 删除按钮（每个应用 1 个）", async () => {
    renderApp();
    await screen.findAllByTestId("app-row");
    const btns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-fn") === "M04.F01.I05");
    expect(btns.length).toBe(SEED.apps.length);
  });

  it("应用行展示 clientId（2026-09-12 用户裁定：列表精简为 Code/ClientID、名称、状态、操作）", async () => {
    renderApp();
    await screen.findAllByTestId("app-row");
    for (const app of SEED.apps) {
      expect(screen.getAllByText(new RegExp(`clientId: ${app.clientId}`)).length).toBe(1);
    }
  });

  it("展示种子四应用：lab-management / erp / crm / saas-console", async () => {
    renderApp();
    for (const app of SEED.apps) {
      expect(await screen.findByText(app.clientName)).toBeTruthy();
    }
  });
});
