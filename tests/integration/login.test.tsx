// M03.F01.I01 — 账号密码登录
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { LoginPage } from "../../src/pages/LoginPage";

// mock axios：避免真实请求（msw 也不会启）
vi.mock("axios", () => {
  const mockPost = vi.fn();
  return {
    default: {
      post: mockPost,
      get: mockPost,
      patch: mockPost,
      put: mockPost,
      delete: mockPost,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      isAxiosError: () => false,
    },
    isAxiosError: () => false,
    __mockPost: mockPost,
  };
});

function renderLogin() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("M03.F01.I01 账号密码登录", () => {
  it("渲染登录表单，提交按钮挂 data-fn=M03.F01.I01", () => {
    renderLogin();
    const submitBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M03.F01.I01");
    expect(submitBtn).toBeTruthy();
    expect(submitBtn).toHaveAttribute("data-fn", "M03.F01.I01");
  });

  it("展示演示账号列表", () => {
    renderLogin();
    expect(screen.getAllByText(/alice/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/bob/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/演示账号/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/公众号/).length).toBeGreaterThanOrEqual(1);
  });
});