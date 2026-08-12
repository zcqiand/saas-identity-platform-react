// M06.F01 — tenant-scoped 审计日志
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuditListPage } from "../../src/pages/AuditListPage";

describe("M06.F01 审计日志（tenant-scoped）", () => {
  it("渲染审计列表，导出按钮挂 data-fn=M06.F01.I03", () => {
    render(
      <MemoryRouter initialEntries={["/tenants/abc/audit"]}>
        <Routes>
          <Route path="/tenants/:tenantId/audit" element={<AuditListPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const btn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M06.F01.I03");
    expect(btn).toBeTruthy();
  });
});
