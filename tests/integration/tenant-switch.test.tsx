// M00.F02.I03 — 切换租户
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { TenantSwitcher } from "../../src/components/tenant-switcher";

describe("M00.F02.I03 当前用户跨租户切换", () => {
  it("渲染 TenantSwitcher，触发按钮挂 data-fn=M00.F02.I03", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <TenantProvider>
          <MemoryRouter>
            <TenantSwitcher />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>,
    );

    const btn = screen.getByTestId("tenant-switcher");
    expect(btn).toBeTruthy();
    expect(btn).toHaveAttribute("data-fn", "M00.F02.I03");
  });
});
