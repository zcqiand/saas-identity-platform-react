// M00.F02.I03 — 切换租户
// Phase 2 真化：真 GET /me/tenants（alice 的 acme/globex 成员关系）+
// 真 POST /me/tenants/:id/switch（签发 tenant-scoped 新 token 落 session）。
// 切换不落业务表（oauth store 在服务端内存），afterEach 复位 localStorage 即可。
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { TenantSwitcher } from "../../src/components/tenant-switcher";
import { installRealChain, SEED } from "../helpers/real-chain";

// Radix DropdownMenu 在 jsdom 下缺 PointerEvent：不 polyfill 时菜单永远打不开
// （login.test.tsx 同款 shim）。
beforeAll(() => {
  if (!window.PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      pointerType: string;
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerType = params.pointerType ?? "";
        this.pointerId = params.pointerId ?? 0;
      }
    }
    (window as { PointerEvent?: unknown }).PointerEvent = PointerEventPolyfill;
  }
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => {};
});

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

function renderSwitcher() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={["/tenants"]}>
          <Routes>
            <Route path="/tenants" element={<TenantSwitcher />} />
            <Route path="/tenants/:tenantId/members" element={<div data-testid="ws-page" />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

describe("M00.F02.I03 当前用户跨租户切换", () => {
  it("渲染 TenantSwitcher，触发按钮挂 data-fn=M00.F02.I03", async () => {
    renderSwitcher();
    const btn = screen.getByTestId("tenant-switcher");
    expect(btn).toBeTruthy();
    expect(btn).toHaveAttribute("data-fn", "M00.F02.I03");
    // 真数据锚：当前租户名来自 /me/tenants ⨝ admin/tenants（种子 acme）
    await waitFor(() => {
      expect(btn.textContent).toContain(SEED.tenants[0].name);
    });
  });

  it("点开菜单切到 globex：真 switch 请求 + session 换新租户", async () => {
    renderSwitcher();
    const btn = screen.getByTestId("tenant-switcher");
    await waitFor(() => {
      expect(btn.textContent).toContain(SEED.tenants[0].name);
    });
    fireEvent.pointerDown(btn, { button: 0, ctrlKey: false, pointerType: "mouse" });
    // DropdownMenu 内容挂 document.body（portal），screen 全局查
    fireEvent.click(screen.getByText(SEED.tenants[1].name));
    // setTenant + navigate：session 的 currentTenantId 换成 globex 种子 id
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("saas.tenant") ?? "{}");
      expect(stored.currentTenantId).toBe(SEED.tenants[1].id);
    });
    // 切换响应里的 accessToken 是服务端真签的 tenant-scoped JWT（三段式）
    const stored = JSON.parse(localStorage.getItem("saas.tenant") ?? "{}");
    expect(String(stored.accessToken)).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  }, 30_000);
});
