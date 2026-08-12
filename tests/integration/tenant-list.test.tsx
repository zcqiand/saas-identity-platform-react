// M00.F01 — 平台级租户管理
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { TenantListPage } from "../../src/pages/TenantListPage";

describe("M00.F01 租户管理（平台 admin）", () => {
  it("渲染租户列表，新建按钮挂 data-fn=M00.F01.I02", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <TenantProvider>
          <MemoryRouter>
            <TenantListPage />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>,
    );
    const createBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M00.F01.I02");
    expect(createBtn).toBeTruthy();
    expect(screen.getAllByTestId("tenant-row").length).toBeGreaterThan(0);
  });
});
