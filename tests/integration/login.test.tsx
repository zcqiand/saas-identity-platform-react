// M01.F04.I03 - 账号密码登录 (PLAN-2026-001 T-9；2026-09-11 B 方案对齐 vue 基准)
//
// Phase 2 真化（Task 10，处置矩阵「保留 component 级」）：mock 墙里的
// useSessionsLogin hook mock 拆除。注入面收敛到 HTTP 层 `vi.spyOn(axios,"post")`
// ——仅负路径（401/423/缺 token）打桩；正路径真打 saas-nextjs :5101
// /api/v1/auth/login（凭证 = shared/scripts/seed-db.mjs 的家族 dev 约定
// plain:dev123456 + 种子用户 alice），token 持久化断言走真响应。
//
// OAuth 2.0 授权码回跳（RFC 6749 §4.1.2，镜像 saas-nextjs app/login）：
// lab 后端 pre-code 后把浏览器送到 /login?code=&redirect_uri=&state=，
// 登录成功后 302 redirect_uri?code&state 回 RP；无参数时行为不变。
// （完整 SSO 矩阵的端到端属于 Phase 3 SSO E2E 边界。）
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { TenantProvider } from "../state-helpers";
import { LoginPage } from "../../src/pages/LoginPage";
import { installRealChain, SEED } from "../helpers/real-chain";

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

/** 家族 dev 约定口令（shared/scripts/seed-db.mjs：sys_user.password = plain:dev123456）。 */
const SEED_DEV_PASSWORD = "dev123456";

/** 构造 axios 形状的错误（toApiError 读 response.status 分支文案）。 */
function axiosErrorWith(status: number, body: unknown): AxiosError {
  const err = new AxiosError(`Request failed with status code ${status}`);
  (err as { response: unknown }).response = { status, data: body };
  return err;
}

function renderLogin(url = "/login?client_id=saas-console") {
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

async function fillAndSubmit(username = "alice", password = SEED_DEV_PASSWORD) {
  fireEvent.change(screen.getByLabelText(/用户名/), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/密码/), {
    target: { value: password },
  });
  fireEvent.submit(screen.getByRole("button", { name: /登/ }));
}

beforeEach(() => {
  toastError.mockReset();
  localStorage.clear();
  installRealChain();
  window.history.replaceState({}, "", "/login");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
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
    const postSpy = vi.spyOn(axios, "post");
    renderLogin("/login");
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("clientId");
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("env VITE_LOGIN_CLIENT_ID 可作兜底（无 query 时，真请求体带该 clientId）", async () => {
    vi.stubEnv("VITE_LOGIN_CLIENT_ID", "saas-console");
    const postSpy = vi.spyOn(axios, "post");
    renderLogin("/login");
    await fillAndSubmit();
    await waitFor(() => {
      // orval 生成的 sessionsLogin 以 (path, body, options) 三参调用 axios.post
      // —— 断言必须带第三参（undefined），否则 waitFor 永不满足（vitest
      // toHaveBeenCalledWith 严格比对元数）。
      expect(postSpy).toHaveBeenCalledWith(
        "/api/v1/auth/login",
        {
          username: "alice",
          password: SEED_DEV_PASSWORD,
          clientId: "saas-console",
        },
        undefined,
      );
    });
    // 放宽说明：真 POST 落 dev server，CI 冷机上 /api/v1/auth/login 首次编译
    // 实测 7.5-10s+（next dev 惰性编译，家族实测指纹），给 per-it 显式放宽。
  }, 30_000);

  it("提交 username/password/clientId -> 真 POST /api/v1/auth/login（LoginRequest 契约 required）", async () => {
    const postSpy = vi.spyOn(axios, "post");
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => {
      // 同上：orval 三参调用，断言带第三参
      expect(postSpy).toHaveBeenCalledWith(
        "/api/v1/auth/login",
        {
          username: "alice",
          password: SEED_DEV_PASSWORD,
          clientId: "saas-console",
        },
        undefined,
      );
    });
  }, 30_000);

  it("登录响应缺 token -> toast 提示且不跳转（HTTP 层打桩）", async () => {
    vi.spyOn(axios, "post").mockResolvedValueOnce({
      data: {
        accessToken: undefined,
        refreshToken: undefined,
        user: { id: "u-1" },
        availableTenants: [{ tenantId: SEED.tenants[0].id }],
      },
    });
    renderLogin();
    await fillAndSubmit("alice", "whatever");
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("token");
    expect(screen.queryByTestId("tenants-page")).toBeNull();
  });

  it("错密码（401，HTTP 层打桩）-> toast 显示用户名或密码错误", async () => {
    vi.spyOn(axios, "post").mockRejectedValueOnce(
      axiosErrorWith(401, { code: "UNAUTHORIZED", message: "Invalid credentials" }),
    );
    renderLogin();
    await fillAndSubmit("alice", "wrong-password");
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("用户名或密码错误");
  });

  it("账号锁定（423，HTTP 层打桩）-> toast 显示锁定提示", async () => {
    vi.spyOn(axios, "post").mockRejectedValueOnce(
      axiosErrorWith(423, { code: "ACCOUNT_LOCKED", message: "account locked" }),
    );
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("锁定");
  });

  it("登录成功（真凭证 alice）-> tenant session 写 localStorage + 跳 /tenants", async () => {
    renderLogin();
    await fillAndSubmit();
    await waitFor(
      () => {
        expect(screen.getByTestId("tenants-page")).toBeTruthy();
      },
      // CI 冷机上 next dev 惰性编译 /api/v1/auth/login 实测可达 10s+，本测试在第 9
      // 顺位，前置 mock-测已使 next dev 重新编译（见上面 test 7/8 mockRejectedValueOnce
      // 重启路由——mock 卸载时 axios 拦截器复位会触发 server HMR），给 60s 兜底。
      { timeout: 60_000 },
    );
    const stored = JSON.parse(localStorage.getItem("saas.tenant") ?? "{}");
    // 真 HS256 JWT（三段式），不是 mock 字面量
    expect(String(stored.accessToken)).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    // alice 的首个 active membership（tenant.created_at ASC）= 种子 acme
    expect(stored.currentTenantId).toBe(SEED.tenants[0].id);
  }, 90_000);
});

// === M01.F04.I03 OAuth 2.0 授权码回跳（RFC 6749 §4.1.2）===

// jsdom 的 window.location.href 只读 — 用 Proxy 拦截赋值记录目标 URL（lab-react 同款手法）。
// 记录赋值次数：code 回跳在真实现里会发生两次（mount 回跳 + 登录成功后 onSubmit
// 的 setTimeout(0) 二次回跳），两次都等齐才收测试，否则游离定时器会把赋值落到
// 下一个测试的 Proxy 里（Phase 2 实测假红指纹）。
//
// 2026-09-24 fix：mount 回跳 + 二次回跳都需等齐。CI 冷机上次序敏感（登录响应未到时
// useEffect 2 抢先 mount 回跳），放宽到 60s 与「登录成功 alice」对齐——同 next dev
// 惰性编译兜底。
function interceptLocationHref(): {
  assigned: () => string;
  count: () => number;
  restore: () => void;
} {
  const original = window.location;
  let assignedHref = "";
  let hits = 0;
  Object.defineProperty(window, "location", {
    configurable: true,
    get() {
      return new Proxy(original, {
        set(target, prop, value) {
          if (prop === "href") {
            assignedHref = String(value);
            hits += 1;
            return true;
          }
          return Reflect.set(target, prop, value);
        },
      });
    },
  });
  return {
    assigned: () => assignedHref,
    count: () => hits,
    restore: () =>
      Object.defineProperty(window, "location", {
        configurable: true,
        value: original,
      }),
  };
}

describe("M01.F04.I03 OAuth code 回跳", () => {
  it("带 ?code=&redirect_uri=&state= 真登录成功 -> 302 redirect_uri?code&state（不跳 /tenants）", async () => {
    const loc = interceptLocationHref();
    try {
      window.history.replaceState(
        {},
        "",
        "/login?client_id=saas-console&code=auth-code-1&redirect_uri=https%3A%2F%2Flab-react.xiangru.uk%2Flogin&state=xyz",
      );
      renderLogin(
        "/login?client_id=saas-console&code=auth-code-1&redirect_uri=https%3A%2F%2Flab-react.xiangru.uk%2Flogin&state=xyz",
      );
      // 真实现（react 与 saas-nextjs app/login 同款 effect）：mount 解析出
      // code+redirect_uri 即回跳，不 gate 登录态 —— 第一次赋值 = mount 回跳。
      await waitFor(() => expect(loc.count()).toBeGreaterThanOrEqual(1));
      await fillAndSubmit();
      // 登录成功（真凭证 alice）后 onSubmit 的 setTimeout(0) 二次回跳，URL 相同
      // 同步放宽到 60s——同 next dev 冷编译兜底（双回跳需要等 mount + login 全链路）。
      await waitFor(() => expect(loc.count()).toBeGreaterThanOrEqual(2), {
        timeout: 60_000,
      });
      const target = new URL(loc.assigned());
      expect(target.origin + target.pathname).toBe("https://lab-react.xiangru.uk/login");
      expect(target.searchParams.get("code")).toBe("auth-code-1");
      expect(target.searchParams.get("state")).toBe("xyz");
      // 回跳 RP，而不是进 saas 自己的 /tenants
      expect(screen.queryByTestId("tenants-page")).toBeNull();
    } finally {
      loc.restore();
      window.history.replaceState({}, "", "/login");
    }
  }, 90_000);

  it("无 OAuth 参数真登录成功 -> 行为不变（跳 /tenants，不读 location.href）", async () => {
    const loc = interceptLocationHref();
    try {
      renderLogin();
      await fillAndSubmit();
      await waitFor(
        () => {
          expect(screen.getByTestId("tenants-page")).toBeTruthy();
        },
        // 同步上面「登录成功 alice」放宽——同 next dev 冷编译兜底。
        { timeout: 60_000 },
      );
      expect(loc.assigned()).toBe("");
    } finally {
      loc.restore();
    }
  }, 90_000);
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
