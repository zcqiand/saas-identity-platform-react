/**
 * OAuth client lib 测试 — M04.F03.I01/I02/I03（saas-react  仓）。
 *
 * 分两类：
 * - 纯 localStorage 单元（默认跑）：state 生成/校验、 token 持久化边界
 * - HTTP 集成（默认 skip）：oauthAuthorize/Exchange/Refresh 真打 saas-nextjs :5101
 *   （msw 剔除 Phase 2 起目标从 msw node server :5100 改 :5101）
 *
 * HTTP 集成需要 LIVE 模式：起真 nextjs :5101 后跑
 *   LIVE_OAUTH_TEST=1 npx vitest run tests/integration/oauth-client.test.ts
 * （LIVE 门保留——完整 SSO 矩阵的收编属 Phase 3 SSO E2E 边界。）
 *
 * 跳过机制：vitest `it.skipIf(!process.env.LIVE_OAUTH_TEST)`，CI 默认无 env 所以跳过。
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  generateState,
  saveState,
  consumeState,
  validateState,
  oauthAuthorize,
  oauthExchangeCode,
  oauthRefresh,
  persistTokens,
  clearTokens,
} from "@/lib/oauth-flow";

const SESSION_KEY = "saas.react.session";
const STATE_KEY = "saas.react.oauth.state";
const LIVE = process.env.LIVE_OAUTH_TEST === "1";

// ─── 纯单元测试（默认跑）─────────────────────────────────────────────

describe("M04.F03 state generation + validation", () => {
  it("generateState yields ≥128 bit entropy, URL-safe", () => {
    const s = generateState();
    expect(s.length).toBeGreaterThanOrEqual(22);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("validateState rejects mismatched lengths in constant time", () => {
    expect(validateState("abc", "abcd")).toBe(false);
    expect(validateState("abc", "xyz")).toBe(false);
    expect(validateState("abc", "abc")).toBe(true);
  });

  it("saveState + consumeState round-trips and clears M04.F03.I01", () => {
    const v = { state: "x", redirectUri: "y", createdAt: 1 };
    saveState(v);
    expect(consumeState()).toEqual(v);
    expect(consumeState()).toBeNull();
  });

  it("consumeState returns null after clearTokens leaves STATE_KEY untouched", () => {
    saveState({ state: "x", redirectUri: "y", createdAt: 1 });
    clearTokens(); // 仅清 SESSION_KEY
    expect(consumeState()).not.toBeNull();
    consumeState(); // cleanup
  });
});

describe("token persistence edge cases", () => {
  beforeEach(() => window.localStorage.clear());

  it("persistTokens tolerates malformed prior session M04.F03.I02", () => {
    window.localStorage.setItem(SESSION_KEY, "{not-json");
    persistTokens({
      accessToken: "a",
      refreshToken: "r",
      tokenType: "Bearer",
      expiresIn: 900,
      userId: "u",
      clientId: "c",
      tenantId: "t",
    });
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY)!);
    expect(parsed.accessToken).toBe("a");
    expect(parsed.refreshToken).toBe("r");
  });

  it("clearTokens removes only token fields M04.F03.I03", () => {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ userId: "u", accessToken: "a", refreshToken: "r", tenantId: "t" }),
    );
    clearTokens();
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY)!);
    expect(parsed.accessToken).toBeUndefined();
    expect(parsed.refreshToken).toBeUndefined();
    expect(parsed.userId).toBe("u");
  });

  it("persistTokens preserves user metadata M04.F03.I02", () => {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ userId: "u-existing", theme: "dark" }),
    );
    persistTokens({
      accessToken: "new-a",
      refreshToken: "new-r",
      tokenType: "Bearer",
      expiresIn: 900,
      userId: "new-u",
      clientId: "c",
      tenantId: "t",
    });
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_KEY)!);
    expect(parsed.userId).toBe("new-u");
    expect(parsed.theme).toBe("dark");
  });

  it("clearTokens on empty session is a no-op M04.F03.I03", () => {
    expect(() => clearTokens()).not.toThrow();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

// ─── HTTP 集成（默认 skip，需 LIVE_OAUTH_TEST=1）─────────────────────

describe.skipIf(!LIVE)(
  "M04.F03.I01 oauthAuthorize — POST /api/v1/oauth/authorize (live nextjs :5101)",
  () => {
    beforeEach(() => window.localStorage.clear());

    it("returns {code, state} for a valid request M04.F03.I01", async () => {
      const state = generateState();
      const result = await oauthAuthorize({
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
        state,
      });
      expect(result.code).toMatch(/^saas-code-/);
      expect(result.state).toBe(state);
    });

    it("returns 400 INVALID_REDIRECT_URI when redirect not in whitelist M04.F03.I01", async () => {
      await expect(
        oauthAuthorize({
          clientId: "lab-management",
          redirectUri: "http://evil.example.com/callback",
          state: generateState(),
        }),
      ).rejects.toMatchObject({ response: { status: 400 } });
    });
  },
);

describe.skipIf(!LIVE)(
  "M04.F03.I02 oauthExchangeCode — POST /api/v1/oauth/token (authorization_code grant, live nextjs :5101)",
  () => {
    beforeEach(() => window.localStorage.clear());

    it("exchanges code for access_token + refresh_token M04.F03.I02", async () => {
      const state = generateState();
      const { code } = await oauthAuthorize({
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
        state,
      });
      const tokens = await oauthExchangeCode({
        code,
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
      });
      expect(tokens.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(tokens.refreshToken).toMatch(/^saas-rt-/);
      expect(tokens.clientId).toBe("lab-management");
    });

    it("writes access/refresh to localStorage M04.F03.I02", async () => {
      const state = generateState();
      const { code } = await oauthAuthorize({
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
        state,
      });
      await oauthExchangeCode({
        code,
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
      });
      const raw = window.localStorage.getItem(SESSION_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });
  },
);

describe.skipIf(!LIVE)(
  "M04.F03.I03 oauthRefresh — POST /api/v1/oauth/token (refresh_token grant, live nextjs :5101)",
  () => {
    beforeEach(() => window.localStorage.clear());

    it("rotates refresh_token M04.F03.I03", async () => {
      const state = generateState();
      const { code } = await oauthAuthorize({
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
        state,
      });
      const initial = await oauthExchangeCode({
        code,
        clientId: "lab-management",
        redirectUri: "http://localhost:5202/login",
      });
      const rotated = await oauthRefresh({
        refreshToken: initial.refreshToken,
        clientId: "lab-management",
      });
      expect(rotated.accessToken).not.toBe(initial.accessToken);
      expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    });

    it("rejects unknown refresh_token with 400 INVALID_GRANT M04.F03.I03", async () => {
      await expect(
        oauthRefresh({
          refreshToken: "bogus-not-in-store",
          clientId: "lab-management",
        }),
      ).rejects.toMatchObject({ response: { status: 400 } });
    });
  },
);

afterEach(() => {
  window.localStorage.removeItem(STATE_KEY);
  window.localStorage.removeItem(SESSION_KEY);
});
