// M03.F01.I01 - 账号密码登录 (PLAN-2026-001 T-9)
//
// 策略：mock `authLogin`（orval 端点函数）与 sonner toast，
// 验证表单提交 -> POST /auth/login 参数、错误提示（401 / 423 锁定）、
// 成功后写 tenant-context session + 跳 /tenants。
//
// OAuth 2.0 授权码回跳（RFC 6749 §4.1.2，镜像 saas-nextjs app/login）：
// lab 后端 pre-code 后把浏览器送到 /login?code=&redirect_uri=&state=，
// 登录成功后 302 redirect_uri?code&state 回 RP；无参数时行为不变。
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantProvider } from "../state-helpers";
import { LoginPage } from "../../src/pages/LoginPage";
import { ApiError } from "../../src/api/http-client";

// mock orval 端点函数（Login 直接 await authLogin）
const { authLoginMock } = vi.hoisted(() => ({ authLoginMock: vi.fn() }));
vi.mock("../../src/api/endpoints/endpoints", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../src/api/endpoints/endpoints")
  >();
  return { ...actual, authLogin: authLoginMock };
});

// mock toast：捕获 toast.error 文案
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { error: toastError, success: vi.fn() },
}));

function renderLogin() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TenantProvider>
        <MemoryRouter initialEntries={["/login"]}>
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
  authLoginMock.mockReset();
  toastError.mockReset();
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

  it("提交 username/password -> POST /auth/login（端点参数一致）", async () => {
    authLoginMock.mockResolvedValue({
      data: {
        accessToken: "at-1",
        refreshToken: "rt-1",
        userId: "u-1",
        currentTenantId: "t-1",
      },
    });
    renderLogin();
    await fillAndSubmit();
    expect(authLoginMock).toHaveBeenCalledWith({
      username: "alice",
      password: "dev123456",
    });
  });

  it("错密码（401）-> toast 显示用户名或密码错误", async () => {
    authLoginMock.mockRejectedValue(
      new ApiError(401, null, "invalid credentials"),
    );
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("用户名或密码错误");
  });

  it("账号锁定（423）-> toast 显示锁定提示", async () => {
    authLoginMock.mockRejectedValue(
      new ApiError(423, { code: "ACCOUNT_LOCKED" }, "account locked"),
    );
    renderLogin();
    await fillAndSubmit();
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0]?.[0])).toContain("锁定");
  });

  it("登录成功 -> tenant session 写 localStorage + 跳 /tenants", async () => {
    authLoginMock.mockResolvedValue({
      data: {
        accessToken: "at-1",
        refreshToken: "rt-1",
        userId: "u-1",
        currentTenantId: "t-1",
      },
    });
    renderLogin();
    await fillAndSubmit();
    await waitFor(() =>
      expect(screen.getByTestId("tenants-page")).toBeTruthy(),
    );
    const stored = JSON.parse(localStorage.getItem("saas.tenant") ?? "{}");
    expect(stored.accessToken).toBe("at-1");
    expect(stored.currentTenantId).toBe("t-1");
  });
});

// === M03.F01.I01 OAuth 2.0 授权码回跳（RFC 6749 §4.1.2）===

// jsdom 的 window.location.href 只读 — 用 Proxy 拦截赋值记录目标 URL（lab-react 同款手法）。
function interceptLocationHref(): { assigned: () => string } {
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
  } as { assigned: () => string; restore: () => void };
}

describe("M03.F01.I01 OAuth code 回跳", () => {
  it("带 ?code=&redirect_uri=&state= 登录成功 -> 302 redirect_uri?code&state（不跳 /tenants）", async () => {
    const loc = interceptLocationHref();
    authLoginMock.mockResolvedValue({
      data: {
        accessToken: "at-1",
        refreshToken: "rt-1",
        userId: "u-1",
        currentTenantId: "t-1",
      },
    });
    try {
      window.history.replaceState(
        {},
        "",
        "/login?code=auth-code-1&redirect_uri=https%3A%2F%2Flab-react.xiangru.uk%2Flogin&state=xyz",
      );
      renderLogin();
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
    authLoginMock.mockResolvedValue({
      data: {
        accessToken: "at-1",
        refreshToken: "rt-1",
        userId: "u-1",
        currentTenantId: "t-1",
      },
    });
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
