// M00.F01 — 租户列表（平台）
// 选中行高亮 + 默认选中 acme + 选中后 localStorage 同时存 id+name + reload 还原

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider, SelectionProvider } from "../state-helpers";
import { TenantListPage } from "../../src/pages/TenantListPage";

function renderWithProviders() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <SelectionProvider>
          <MemoryRouter initialEntries={["/tenants"]}>
            <Routes>
              <Route path="/tenants" element={<TenantListPage />} />
            </Routes>
          </MemoryRouter>
        </SelectionProvider>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("M00.F01 租户列表（平台）", () => {
  it("渲染 3 行租户（来自 mocked fetch），新建按钮挂 data-fn=M00.F01.I02", async () => {
    renderWithProviders();
    const rows = await screen.findAllByTestId("tenant-row");
    expect(rows.length).toBe(3);
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M00.F01.I02");
    expect(btn).toBeTruthy();
  });

  it("默认选中 acme（data-selected=true + ✓ 标记）", async () => {
    renderWithProviders();
    await screen.findAllByTestId("tenant-row");
    const rows = screen.getAllByTestId("tenant-row");
    const acmeRow = rows.find((r) => r.textContent?.includes("acme"));
    expect(acmeRow?.getAttribute("data-selected")).toBe("true");
    expect(screen.getAllByTestId("tenant-selected-mark").length).toBe(1);
  });

  it("点击另一行切换选中", async () => {
    renderWithProviders();
    await screen.findAllByTestId("tenant-row");
    const rows = screen.getAllByTestId("tenant-row");
    const globexRow = rows.find((r) => r.textContent?.includes("globex"))!;
    fireEvent.click(globexRow);
    expect(globexRow.getAttribute("data-selected")).toBe("true");
    expect(screen.getAllByTestId("tenant-selected-mark").length).toBe(1);
  });

  it("选中后 localStorage 存 id+name", async () => {
    renderWithProviders();
    await screen.findAllByTestId("tenant-row");
    const rows = screen.getAllByTestId("tenant-row");
    const globexRow = rows.find((r) => r.textContent?.includes("globex"))!;
    fireEvent.click(globexRow);
    const raw = localStorage.getItem("saas.selected.tenant");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.id).toBe("00000000-0000-0000-0000-000000000002");
    expect(parsed.name).toBe("Globex Industries");
  });

  it("reload 后从 localStorage 还原选中", async () => {
    localStorage.setItem(
      "saas.selected.tenant",
      JSON.stringify({ id: "00000000-0000-0000-0000-000000000002", name: "Globex Industries" }),
    );
    renderWithProviders();
    await screen.findAllByTestId("tenant-row");
    const rows = screen.getAllByTestId("tenant-row");
    const globexRow = rows.find((r) => r.textContent?.includes("globex"))!;
    expect(globexRow.getAttribute("data-selected")).toBe("true");
  });
});