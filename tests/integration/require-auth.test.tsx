// M03.F01 / 路由守卫：未登录时访问 /tenants 自动重定向到 /login
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider, SelectionProvider } from "../state-helpers";
import App from "../../src/App";
import axios from "axios";

vi.spyOn(axios, "get").mockRejectedValue(new Error("unmocked"));
vi.spyOn(axios, "post").mockRejectedValue(new Error("unmocked"));

beforeEach(() => {
  localStorage.clear();
});

describe("路由守卫 RequireAuth", () => {
  it("未登录访问 /tenants → 重定向到 /login", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <TenantProvider>
          <SelectionProvider>
            <MemoryRouter initialEntries={["/tenants"]}>
              <App />
            </MemoryRouter>
          </SelectionProvider>
        </TenantProvider>
      </QueryClientProvider>,
    );
    // 渲染后应落到 /login（找登录标题）
    await waitFor(() => {
      expect(screen.getAllByText("SaaS 多租户身份平台").length).toBeGreaterThan(0);
    });
  });

  it("未登录访问 /tenants/acme/users → 同样重定向 /login", async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <TenantProvider>
          <SelectionProvider>
            <MemoryRouter initialEntries={["/tenants/acme/users"]}>
              <App />
            </MemoryRouter>
          </SelectionProvider>
        </TenantProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getAllByText("SaaS 多租户身份平台").length).toBeGreaterThan(0);
    });
  });
});