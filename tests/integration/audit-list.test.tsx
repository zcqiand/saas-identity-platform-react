// M06.F01 — tenant-scoped 审计日志（只读，导出按钮已移除）
// 2026-09-09 ADR-0028：M06 整段已废弃（目标 DDL 不再包含 audit_events），
// 测试名与 data-fn 不再锚定 M06.F01.* —— 改为描述性字符串，等真正复活时挂 BASE ID。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditListPage } from "../../src/pages/AuditListPage";

beforeEach(() => {
  localStorage.clear();
});

describe("M06.F01 审计日志（tenant-scoped, 9/7 已废段待删）", () => {
  it("renders audit list without export button (placeholder)", async () => {
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
      .find((b) => b.getAttribute("data-fn") === "audit-export-deprecated");
    expect(exportBtn).toBeUndefined();
  });
});