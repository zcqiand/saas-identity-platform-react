// 2026-09-12 契约形状收敛（ADR-0032 终审修复轮）→ Phase 2 真化（Task 10）：
// OAuthClient 形状断言对真响应（真 nextjs :5101 /api/v1/admin/clients）+
// saas-shared OpenAPI 产物双锚（orval 模型 src/api/endpoints/model 的字段名/
// 类型就是 shared 契约投影，见 model/oauthClient.ts：clientId / clientName /
// status:number / scopes:string）。页面按契约字段渲染，写路径按 clientId
// （code 形）寻址（真后端按 client_id 列查）。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { AppListPage } from "../../src/pages/AppListPage";
import { installRealChain, SEED, testToken } from "../helpers/real-chain";

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

function renderApp() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/apps"]}>
        <Routes>
          <Route path="/apps" element={<AppListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("M04.F01 应用列表——契约 OAuthClient 形状", () => {
  it("真响应字段符合 OAuthClient 契约（clientId/clientName/status:number/scopes:string）", async () => {
    const res = await axios.get<{ items: Array<Record<string, unknown>> }>(
      "/api/v1/admin/clients",
      { headers: { Authorization: `Bearer ${testToken()}` } },
    );
    const items = res.data.items;
    expect(items.length).toBe(SEED.apps.length);
    for (const row of items) {
      expect(typeof row.clientId).toBe("string");
      expect(typeof row.clientName).toBe("string");
      expect(typeof row.status).toBe("number"); // ADR-0032：smallint 数字，不是 "active" 字符串
      expect(typeof row.scopes).toBe("string"); // 9/7 SSOT pivot：逗号分隔字符串，非数组
      expect(typeof row.autoApprove).toBe("boolean");
    }
    // 与种子集对齐（clientId = code 形）
    expect(items.map((r) => r.clientId).sort()).toEqual(SEED.apps.map((a) => a.clientId).sort());
  });

  it("clientName 渲染到名称列（真后端下名称不再空白）", async () => {
    renderApp();
    for (const app of SEED.apps) {
      expect(await screen.findByText(app.clientName)).toBeTruthy();
    }
  });

  it("数字 status：种子四应用全为 1 → 每行渲染活跃徽章", async () => {
    renderApp();
    await screen.findByText(SEED.apps[0].clientName);
    expect(screen.getAllByText("活跃").length).toBe(SEED.apps.filter((a) => a.status === 1).length);
    expect(screen.queryByText("已暂停")).toBeNull();
  });

  it("clientId 行渲染契约 clientId 字符串", async () => {
    renderApp();
    await screen.findByText(SEED.apps[0].clientName);
    expect(screen.getAllByText(/clientId: lab-management/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/clientId: saas-console/).length).toBeGreaterThanOrEqual(1);
  });
});
