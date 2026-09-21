// 成员管理页真链路测试（tenant-scoped 用户列表七项收口）。
// 基建照抄 tests/integration/role-list.test.tsx：installRealChain + SEED + MemoryRouter。
// 断言锚 saas-shared seeds（tenant1 = tenants[0] 共 3 名成员：alice/bob active、
// carol invited——seeds/tenant_member.json c...001~003；禁止硬编码易变业务值）。
// it() 标题不带功能 ID 字面（fnReporter 泄漏禁令）；UI 锚由页面 data-fn 属性承载。
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserListPage } from "../../src/pages/UserListPage";
import { installRealChain, SEED } from "../helpers/real-chain";

beforeEach(() => {
  localStorage.clear();
  installRealChain();
});

function mount() {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/tenants/${SEED.tenants[0].id}/members`]}>
        <Routes>
          <Route path="/tenants/:tenantId/members" element={<UserListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("成员管理页（tenant-scoped 用户列表）", () => {
  it("渲染种子成员行：alice / bob 在列", async () => {
    mount();
    const rows = await screen.findAllByTestId("user-row");
    const text = rows.map((r) => r.textContent).join("|");
    expect(text).toContain("alice");
    expect(text).toContain("bob");
  });

  it("状态过滤 invited：只剩种子里的已邀请成员行", async () => {
    mount();
    await screen.findAllByTestId("user-row");
    fireEvent.change(screen.getByLabelText("状态过滤"), { target: { value: "invited" } });
    // 种子：tenant1 的 invited 成员恰 1 行（c...003 → user b...003 carol = SEED.users[2]）
    const invitedRows = await screen.findAllByTestId("user-row");
    expect(invitedRows.length).toBe(1);
    expect(invitedRows[0].textContent).toContain(SEED.users[2].username);
  });

  it("每页 2 条分页：翻到第 2 页页码指示更新", async () => {
    mount();
    await screen.findAllByTestId("user-row");
    fireEvent.change(screen.getByLabelText("每页"), { target: { value: "2" } });
    expect((await screen.findAllByTestId("user-row")).length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByTestId("user-page-indicator").textContent).toContain("第 2 页");
  });

  it("行内详情弹层：展示邮箱与角色码完整信息", async () => {
    mount();
    const aliceRow = (await screen.findAllByTestId("user-row")).find((r) =>
      r.textContent?.includes("alice"),
    )!;
    fireEvent.click(within(aliceRow).getByRole("button", { name: "详情" }));
    const dlg = await screen.findByTestId("member-detail-dialog");
    // 种子：alice roleIds=[a...001] → rolesQ 映射出 roleCode admin
    await within(dlg).findByText(/admin/);
    expect(dlg.textContent).toContain("alice");
    expect(dlg.textContent).toContain("alice@acme.io");
  });

  it("创建成员并勾选 admin 角色：行内角色计数为 1 项", async () => {
    mount();
    await screen.findAllByTestId("user-row");
    fireEvent.click(screen.getByRole("button", { name: "创建成员" }));
    // 必填字段的 label 带 * 尾巴（Field 组件），全串精确匹配放行锚定正则
    fireEvent.change(screen.getByLabelText(/^用户名/), { target: { value: "dora" } });
    fireEvent.change(screen.getByLabelText(/^初始密码/), { target: { value: "dora-pass-123" } });
    fireEvent.change(screen.getByLabelText(/^邮箱/), { target: { value: "dora@acme.io" } });
    // label 双 span（roleCode + roleName），testing-library 全串匹配放行正则
    fireEvent.click(await screen.findByLabelText(/admin/));
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    // 创建成功后自动 assignRoles → 行渲染且角色计数为 1 项
    //（waitFor 兜住「先出现 0 项、assignRoles 刷新后 1 项」的中间态）
    const row = await waitFor(() => {
      const r = screen.getByText("dora").closest("[data-testid='user-row']")!;
      expect(r.textContent).toContain("1 项");
      return r;
    });
    expect(row).toBeTruthy();
  });

  it("邀请成员：email 前缀用户名的已邀请行出现", async () => {
    mount();
    await screen.findAllByTestId("user-row");
    const email = `ivy-${Date.now()}@acme.io`;
    const ivyUsername = email.split("@")[0]!;
    fireEvent.click(screen.getByRole("button", { name: "邀请成员" }));
    fireEvent.change(screen.getByLabelText(/^邮箱/), { target: { value: email } });
    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));
    // 后端语义：username=email 前缀、无邀请链接展示面（brief 断言核心=行出现）。
    // 徽标不在此断言：nextjs invite 实建 tenant_member.status=active（与其自身
    // seeds 的 invited 行漂移），后端零触碰——候选修复记入任务报告，不在前端硬凑。
    const cell = await screen.findByText(ivyUsername);
    const row = cell.closest("[data-testid='user-row']")!;
    expect(row.textContent).toContain(email);
  });

  it("编辑成员：可改邮箱与手机号，弹窗无状态字段", async () => {
    mount();
    const row7 = (await screen.findAllByTestId("user-row")).find((r) =>
      r.textContent?.includes("alice"),
    )!;
    fireEvent.click(within(row7).getByRole("button", { name: "编辑" }));
    expect(screen.getByLabelText(/^邮箱/)).toHaveValue("alice@acme.io");
    expect(screen.queryByLabelText("状态")).toBeNull(); // 状态已从编辑弹窗移除（精确匹配不误中「状态过滤」）
    fireEvent.change(screen.getByLabelText(/^手机号/), { target: { value: "13800000000" } });
    fireEvent.change(screen.getByLabelText(/^邮箱/), { target: { value: "alice2@acme.io" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await screen.findByText("alice2@acme.io");
  });

  it("行内停用经确认后：状态徽标翻转为暂停", async () => {
    mount();
    const bobRow = (await screen.findAllByTestId("user-row")).find((r) =>
      r.textContent?.includes("bob"),
    )!;
    fireEvent.click(within(bobRow).getByRole("button", { name: "停用" }));
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    const refreshed = (await screen.findAllByTestId("user-row")).find((r) =>
      r.textContent?.includes("bob"),
    )!;
    await within(refreshed).findByText(/暂停/);
  });
});
