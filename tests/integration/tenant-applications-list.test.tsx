// M00.F05 — tenant-scoped 应用订阅列表（CRUD + 状态切换）
// Phase 2 真化：直连真 nextjs :5101。种子语义（shared/scripts/seed-db.mjs）：
// 每租户固定预订阅 lab-management 一行——旧「空列表 EmptyState」断言是 msw
// mock 时代的形状，随拦截墙一起拆除；订阅写路径走真 POST，测试订阅 erp 后
// afterEach 真 DELETE 清理（隔离纪律：不留状态）。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { TenantApplicationsListPage } from "../../src/pages/TenantApplicationsListPage";
import { TenantProvider, SelectionProvider } from "../state-helpers";
import { installRealChain, SEED, testToken } from "../helpers/real-chain";

const TENANT_ID = SEED.tenants[0].id;
const SUBSCRIBE_PATH = `/api/v1/tenants/${TENANT_ID}/applications`;

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

// 写路径隔离：测试订阅的 erp 行无论断言成败都真 DELETE（幂等：不存在时 404 吞掉）
afterEach(async () => {
  try {
    await axios.delete(`${SUBSCRIBE_PATH}/erp`, {
      headers: { Authorization: `Bearer ${testToken()}` },
    });
  } catch {
    /* 404 = 本用例没成功订阅，无需清理 */
  }
});

function renderPage(initialPath = `/tenants/${TENANT_ID}/applications`) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <SelectionProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route
                path="/tenants/:tenantId/applications"
                element={<TenantApplicationsListPage />}
              />
            </Routes>
          </MemoryRouter>
        </SelectionProvider>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

describe("M00.F05 租户应用", () => {
  it("渲染租户应用页，订阅应用按钮挂 data-fn=M00.F05.I02", async () => {
    renderPage();
    const btn = await screen.findByRole("button", { name: "订阅应用" });
    expect(btn.getAttribute("data-fn")).toBe("M00.F05.I02");
  });

  it("渲染种子的预订阅行：lab-management（真数据锚，替换 msw 时代空列表断言）", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("tenant-app-row");
    expect(rows.length).toBe(1);
    // appName 由 adminClients 列表解析（clientId → clientName）——与订阅行查询
    // 并发，落地有先后；同步断言会抢在富化前跑（实测偶发假红），改 waited。
    expect(await screen.findByText("建筑工程实验室管理系统")).toBeTruthy();
    expect(screen.getAllByText("lab-management").length).toBeGreaterThan(0);
  });

  it("打开订阅对话框、填 clientId 提交（真 POST，afterEach 清理）", async () => {
    renderPage();
    const open = await screen.findByRole("button", { name: "订阅应用" });
    fireEvent.click(open);
    const clientInput = await screen.findByLabelText(/Client ID/);
    fireEvent.change(clientInput, { target: { value: "erp" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    // 真 POST 落库 + refetch：erp 订阅行出现（appName 解析自 adminClients）
    await waitFor(
      () => {
        const rows = screen.getAllByTestId("tenant-app-row");
        expect(rows.some((r) => r.textContent?.includes("企业资源计划系统"))).toBe(true);
      },
      { timeout: 20_000 },
    );
  }, 30_000);
});
