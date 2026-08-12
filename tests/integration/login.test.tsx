// M03.F01.I01 — 账号密码登录
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { LoginPage } from "../../src/pages/LoginPage";

describe("M03.F01.I01 账号密码登录", () => {
  it("渲染登录表单，挂 data-fn=M03.F01.I01 的提交按钮", () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <TenantProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </TenantProvider>
      </QueryClientProvider>,
    );

    const submitBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M03.F01.I01");
    expect(submitBtn).toBeTruthy();
    expect(submitBtn).toHaveAttribute("data-fn", "M03.F01.I01");
  });
});
