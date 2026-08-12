// M06.F01 — tenant-scoped 审计日志（只读，导出按钮已移除）
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditListPage } from "../../src/pages/AuditListPage";

beforeEach(() => {
  localStorage.clear();
});

describe("M06.F01 审计日志（tenant-scoped）", () => {
  it("渲染审计列表，且不再挂导出按钮（M06.F01.I03 改为留 TODO）", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/tenants/abc/audit"]}>
          <Routes>
            <Route path="/tenants/:tenantId/audit" element={<AuditListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await screen.findByText(/操作事件流/);
    const exportBtn = screen
      .queryAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M06.F01.I03");
    expect(exportBtn).toBeUndefined();
  });
});