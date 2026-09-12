// M01.F04.I03 - 账号密码登录 (PLAN-2026-001 T-9；2026-09-11 B 方案对齐 vue 基准)
//
// 策略：mock `useSessionsLogin`（orval hook）与 sonner toast，
// 验证表单提交 -> POST /auth/login 参数（含 clientId，LoginRequest 契约 required）、
// clientId 门（无 query 无 env 拒绝）、错误提示（401 / 423 锁定 / 缺 token）、
// 成功后写 tenant-context session + 跳 /tenants。
//
// OAuth 2.0 授权码回跳（RFC 6749 §4.1.2，镜像 saas-nextjs app/login）：
// lab 后端 pre-code 后把浏览器送到 /login?code=&redirect_uri=&state=，
// 登录成功后 302 redirect_uri?code&state 回 RP；无参数时行为不变。
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { LoginPage } from "../../src/pages/LoginPage";
import { ApiError } from "../../src/api/http-client";

// mock orval hook（LoginPage 用 useSessionsLogin().mutateAsync）
const { sessionsLoginMock } = vi.hoisted(() => ({ sessionsLoginMock: vi.fn() }));
vi.mock("../../src/api/endpoints/auth/auth", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/api/endpoints/auth/auth")
  >();
  return {
    ...actual,
    useSessionsLogin: () => ({ mutateAsync: sessionsLoginMock }),
  };
});

// mock toast：捕获 toast.error 文案（Toaster 组件随 LoginPage 自挂，mock 成空渲染）
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: vi.fn() },
  Toaster: () => null,
}));

// Radix DropdownMenu 在 jsdom 下缺 PointerEvent：不 polyfill 时 testing-library 退化为
// 基础 Event，button/pointerType 被 Event 构造器丢弃，Radix 的 whenMouse/button===0
// 判断全挂，菜单永远打不开（saas-nextjs login.test.tsx 同款 shim）。
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

const LOGIN_RESPONSE = {
  accessToken: "at-1",
  refreshToken: "rt-1",
  user: { id: "u-1", email: "alice@acme.io" },
  availableTenants: [{ tenantId: "t-1" }],
  clientId: "cid-test",
};

function renderLogin(url = "/login?client_id=cid-test") {
  // LoginPage 读 window.location.search（不依赖路由 query 时序）——jsdom 侧同步设 URL
  window.history.replaceState({}, "", url);
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/tenants" element={<div data-testid="tenants-page" />} />
          </Routes>
        </MemoryRouter>
      </TenantProvider>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/用户名/), {
    target: { value: "alice" },
  });
  fireEvent.change(screen.getByLabelText(/密码/), {
    target: { value: "dev123456" },
  });
  fireEvent.submit(screen.getByRole("button", { name: /登/ }));
}

beforeEach(() => {
  sessionsLoginMock.mockReset();
  toastError.mockReset();
  localStorage.clear();
  window.history.replaceState({}, "", "/login");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("M01.F04.I03 账号密码登录", () => {
  it("渲染登录表单，提交按钮挂 data-fn=M01.F04.I03", () => {
    renderLogin();
    const submitBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("data-fn") === "M01.F04.I03");
    expect(submitBtn).toBeTruthy();
    expect(submitBtn).toHaveAttribute("data-fn", "M01.F04.I03");
  });

  it("展示演示账号获取引导（账号列表已随密码下架删除，2026-09-01）", () => {
    renderLogin();
    // LoginPage 删掉了 DEMO_ACCOUNTS 用户名列表（demo 账号不再公开），
    // 保留「密码不公开 → 公众号引导」块 —— 断言跟随 UI 现状。
    expect(screen.getAllByText(/演示账号/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/公众号/).length).toBeGreaterThanOrEqual(1);
  });

  it("无 client_id（query 与 env 均缺）提交 -> toast 缺少 clientId 且不发请求", async () => {
    vi.stubEnv("VITE_LOGIN_CLIENT_ID", "");
    renderLogin("/login");
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("clientId");
    expect(sessionsLoginMock).not.toHaveBeenCalled();
  });

  it("env VITE_LOGIN_CLIENT_ID 可作兜底（无 query 时）", async () => {
    vi.stubEnv("VITE_LOGIN_CLIENT_ID", "cid-from-env");
    sessionsLoginMock.mockResolvedValue({ data: LOGIN_RESPONSE });
    renderLogin("/login");
    await fillAndSubmit();
    await waitFor(() =>
      expect(sessionsLoginMock).toHaveBeenCalledWith({
        data: { username: "alice", password: "dev123456", clientId: "cid-from-env" },
      }),
    );
  });

  it("提交 username/password/clientId -> POST /auth/login（端点参数一致，LoginRequest required）", async () => {
    sessionsLoginMock.mockResolvedValue({ data: LOGIN_RESPONSE });
    renderLogin();
    await fillAndSubmit();
    expect(sessionsLoginMock).toHaveBeenCalledWith({
      data: { username: "alice", password: "dev123456", clientId: "cid-test" },
    });
  });

  it("登录响应缺 token -> toast 提示且不跳转", async () => {
    sessionsLoginMock.mockResolvedValue({
      data: { ...LOGIN_RESPONSE, accessToken: undefined, refreshToken: undefined },
    });
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("token");
    expect(screen.queryByTestId("tenants-page")).toBeNull();
  });

  it("错密码（401）-> toast 显示用户名或密码错误", async () => {
    sessionsLoginMock.mockRejectedValue(
      new ApiError(401, null, "invalid credentials"),
    );
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("用户名或密码错误");
  });

  it("账号锁定（423）-> toast 显示锁定提示", async () => {
    sessionsLoginMock.mockRejectedValue(
      new ApiError(423, { code: "ACCOUNT_LOCKED" }, "account locked"),
    );
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("锁定");
  });

  it("登录成功 -> tenant session 写 localStorage + 跳 /tenants", async () => {
    sessionsLoginMock.mockResolvedValue({ data: LOGIN_RESPONSE });
    renderLogin();
    await fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByTestId("tenants-page")).toBeTruthy(),
    );
    const stored = JSON.parse(localStorage.getItem("saas.tenant") ?? "{}");
    expect(stored.accessToken).toBe("at-1");
    // userId/currentTenantId 来自 LoginResponse.user / availableTenants（B 基准，对齐 vue）
    expect(stored.currentTenantId).toBe("t-1");
  });
});

// === M01.F04.I03 OAuth 2.0 授权码回跳（RFC 6749 §4.1.2）===

// jsdom 的 window.location.href 只读 — 用 Proxy 拦截赋值记录目标 URL（lab-react 同款手法）。
function interceptLocationHref(): { assigned: () => string; restore: () => void } {
  const original = window.location;
  let assignedHref = "";
  Object.defineProperty(window, "location", {
    configurable: true,
    get() {
      return new Proxy(original, {
        set(target, prop, value) {
          if (prop === "href") {
            assignedHref = String(value);
            return true;
          }
          return Reflect.set(target, prop, value);
        },
      });
    },
  });
  return {
    assigned: () => assignedHref,
    restore: () =>
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      }),
  };
}

describe("M01.F04.I03 OAuth code 回跳", () => {
  it("带 ?code=&redirect_uri=&state= 登录成功 -> 302 redirect_uri?code&state（不跳 /tenants）", async () => {
    const loc = interceptLocationHref();
    sessionsLoginMock.mockResolvedValue({ data: LOGIN_RESPONSE });
    try {
      window.history.replaceState(
        {},
        "",
        "/login?client_id=cid-test&code=auth-code-1&redirect_uri=https%3A%2F%2Flab-react.xiangru.uk%2Flogin&state=xyz",
      );
      renderLogin(
        "/login?client_id=cid-test&code=auth-code-1&redirect_uri=https%3A%2F%2Flab-react.xiangru.uk%2Flogin&state=xyz",
      );
      await fillAndSubmit();
      await waitFor(() => expect(loc.assigned()).toBeTruthy());
      const target = new URL(loc.assigned());
      expect(target.origin + target.pathname).toBe(
        "https://lab-react.xiangru.uk/login",
      );
      expect(target.searchParams.get("code")).toBe("auth-code-1");
      expect(target.searchParams.get("state")).toBe("xyz");
      // 回跳 RP，而不是进 saas 自己的 /tenants
      expect(screen.queryByTestId("tenants-page")).toBeNull();
      // 吸干 onSubmit 路径的 setTimeout(0)（waitFor 可能被挂载期自动回跳先行满足），
      // 否则游离定时器会在下一个测试的 Proxy 里落赋值。
      await new Promise((r) => setTimeout(r, 20));
    } finally {
      loc.restore();
      window.history.replaceState({}, "", "/login");
    }
  });

  it("无 OAuth 参数登录成功 -> 行为不变（跳 /tenants，不读 location.href）", async () => {
    const loc = interceptLocationHref();
    sessionsLoginMock.mockResolvedValue({ data: LOGIN_RESPONSE });
    try {
      renderLogin();
      await fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByTestId("tenants-page")).toBeTruthy(),
      );
      expect(loc.assigned()).toBe("");
    } finally {
      loc.restore();
    }
  });
});

// 2026-09-12：登录页「当前后端模式」静态标签 → BackendBadge 切换器
// （对齐 saas-nextjs；dev 诊断工具，不挂功能 ID）
describe("登录页后端切换器", () => {
  function badgeTrigger(): HTMLElement {
    const badge = screen.getByTestId("backend-badge");
    const btn = badge.querySelector("button");
    expect(btn).toBeTruthy();
    return btn as HTMLElement;
  }

  it("渲染 BackendBadge，未选择时显示 env 默认", () => {
    renderLogin();
    expect(badgeTrigger().textContent).toContain("(env 默认)");
  });

  it("选 springboot -> localStorage 持久化 + 触发按钮显示 springboot", () => {
    renderLogin();
    // jsdom 无 PointerEvent 构造器 -> 需显式给 button（Radix 判 event.button===0）
    fireEvent.pointerDown(badgeTrigger(), { button: 0, ctrlKey: false, pointerType: "mouse" });
    // DropdownMenu 内容挂 document.body（portal），screen 全局查
    fireEvent.click(screen.getByText("springboot"));
    expect(localStorage.getItem("saas.api.backend")).toBe("springboot");
    expect(badgeTrigger().textContent).toContain("springboot");
  });

  it("切回 env 默认 -> localStorage 清除", () => {
    localStorage.setItem("saas.api.backend", "springboot");
    renderLogin();
    expect(badgeTrigger().textContent).toContain("springboot");
    fireEvent.pointerDown(badgeTrigger(), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(screen.getByText("env 默认（部署配置）"));
    expect(localStorage.getItem("saas.api.backend")).toBeNull();
    expect(badgeTrigger().textContent).toContain("(env 默认)");
  });
});
