// M04.F01 — 应用列表（平台级；apps 同时承载菜单 + OAuth client）
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppListPage } from "../../src/pages/AppListPage";

beforeEach(() => {
  localStorage.clear();
});

function renderApp() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/apps"]}>
        <Routes>
          <Route path="/apps" element={<AppListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("M04.F01 应用列表（平台级）", () => {
  it("渲染 3 个应用行，新建按钮挂 data-fn=M04.F01.I02", async () => {
    renderApp();
    const rows = await screen.findAllByTestId("app-row");
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M04.F01.I02");
    expect(btn).toBeTruthy();
  });

  it("应用行挂 data-fn=M04.F02.I06 启用/停用按钮", async () => {
    renderApp();
    await screen.findAllByTestId("app-row");
    const btns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-fn") === "M04.F02.I06");
    expect(btns.length).toBeGreaterThanOrEqual(1);
  });

  it("应用行挂 data-fn=M04.F01.I05 删除按钮", async () => {
    renderApp();
    await screen.findAllByTestId("app-row");
    const btns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-fn") === "M04.F01.I05");
    expect(btns.length).toBeGreaterThanOrEqual(3);
  });

  it("应用行展示 clientId 与一方/三方标记", async () => {
    renderApp();
    await screen.findAllByTestId("app-row");
    expect(screen.getAllByText(/clientId:/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("一方").length).toBeGreaterThanOrEqual(3);
  });

  it("展示 3 个应用：lab-management / erp / crm", async () => {
    renderApp();
    expect(await screen.findByText("建筑工程实验室管理系统")).toBeTruthy();
    expect(screen.getByText("企业资源计划系统")).toBeTruthy();
    expect(screen.getByText("客户关系管理系统")).toBeTruthy();
  });
});