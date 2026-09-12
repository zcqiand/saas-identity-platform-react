// 2026-09-12 契约形状收敛（ADR-0032 终审修复轮）：fixture 与后端均为 shared 契约
// OAuthClient——clientId / clientName / status:number（1=启用 / 2=ADR-0032 suspended 语义）/
// scopes:string。页面按契约字段渲染，写路径按 clientId（code 形）寻址（真后端按 client_id 列查）。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppListPage } from "../../src/pages/AppListPage";

// 真后端实测 shape（:5104/:5105 curl 采样）
const CONTRACT_CLIENTS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    clientId: "lab-management",
    clientName: "建筑工程实验室管理系统",
    grantTypes: "client_credentials,authorization_code",
    redirectUris: "http://localhost:5202/login",
    scopes: "lab.read,lab.write",
    accessTokenValidity: 7200,
    refreshTokenValidity: 2592000,
    autoApprove: true,
    status: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-12T00:00:00Z",
  },
  {
    id: "11111111-1111-1111-1111-111111111112",
    clientId: "erp",
    clientName: "企业资源计划系统",
    grantTypes: "client_credentials,authorization_code",
    redirectUris: "http://localhost:3010/callback",
    scopes: "erp.read,erp.write",
    accessTokenValidity: 7200,
    refreshTokenValidity: 2592000,
    autoApprove: true,
    status: 2,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-12T00:00:00Z",
  },
];

// 覆盖 setup.ts 的 App 形状 mock——本文件专测契约形状
vi.mock("@/api/endpoints/admin-clients/admin-clients", () => ({
  adminClientsListClients: async () => ({
    data: { items: CONTRACT_CLIENTS, page: 1, pageSize: 2, total: 2 },
  }),
  adminClientsCreateClient: async () => ({ data: {} }),
  adminClientsUpdateClient: async () => ({ data: {} }),
  adminClientsDeleteClient: async () => ({ data: undefined }),
  adminClientsSetClientStatus: async () => ({ data: undefined }),
}));

beforeEach(() => {
  localStorage.clear();
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
  it("clientName 渲染到名称列（真后端下名称不再空白）", async () => {
    renderApp();
    expect(await screen.findByText("建筑工程实验室管理系统")).toBeTruthy();
    expect(screen.getByText("企业资源计划系统")).toBeTruthy();
  });

  it("数字 status：1 渲染活跃徽章、2（ADR-0032 suspended）渲染停用徽章", async () => {
    renderApp();
    await screen.findByText("建筑工程实验室管理系统");
    expect(screen.getByText("活跃")).toBeTruthy();
    expect(screen.getByText("已暂停")).toBeTruthy();
  });

  it("clientId 行渲染契约 clientId 字符串", async () => {
    renderApp();
    await screen.findByText("建筑工程实验室管理系统");
    expect(screen.getAllByText(/clientId: lab-management/).length).toBeGreaterThanOrEqual(1);
  });
});
