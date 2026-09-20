/**
 * OAuth 2.0 client flow (RFC 6749 §4.1) — 薄 wrapper，叠在 orval 生成
 * `src/api/endpoints/oauth/oauth.ts` 的 oAuthAuthorize / oAuthToken 之上。
 *
 * 设计要点：
 * - state: 本地生成 + 暂存 localStorage，回传后比对；与 saas-nextjs IdP 同语义
 * - redirect_uri: 必须由 caller 提供（一般是 window.location.origin + /oauth/callback）
 * - tokens: localStorage[`saas.react.session`] 持久化（与 saas-react 现有 PersistedSession 兼容）
 * - 错误：与 saas-nextjs OAuth store handler 一致——INVALID_REDIRECT_URI 400 / INVALID_CLIENT 400 / INVALID_GRANT 400
 *
 * 本文件对应 BASE M04.F03.I01/I02/I03（react 仓 client lib 实现）。
 * M01.F04.*（密码登录 / 失败锁定 / refresh）不在本仓——react 通过 OAuth 跳板登录（ADR-0013）。
 */

import { oAuthAuthorize, oAuthToken } from "@/api/endpoints/oauth/oauth";

const STATE_KEY = "saas.react.oauth.state";
const SESSION_KEY = "saas.react.session";

export interface OAuthStateValue {
  state: string;
  redirectUri: string;
  createdAt: number;
}

/** 生成 RFC 6749 §10.12 推荐的不可猜 state 串（base64url, ≥128 bit entropy）。 */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64url (no padding)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 暂存 state + redirect_uri 用于回调校验。同一 origin 内允许 1 个 pending 流程。 */
export function saveState(value: OAuthStateValue): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify(value));
}

/** 读出并清除 pending state。 */
export function consumeState(): OAuthStateValue | null {
  const raw = window.localStorage.getItem(STATE_KEY);
  if (!raw) return null;
  window.localStorage.removeItem(STATE_KEY);
  try {
    return JSON.parse(raw) as OAuthStateValue;
  } catch {
    return null;
  }
}

/** 常量时间比对，防止 timing attack。 */
export function validateState(returnedState: string, expected: string): boolean {
  if (returnedState.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < returnedState.length; i++) {
    diff |= returnedState.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** M04.F03.I01: 授权码签发。返回 `{code, state}`。 */
export async function oauthAuthorize(args: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state: string;
}): Promise<{ code: string; state: string }> {
  const resp = await oAuthAuthorize({
    clientId: args.clientId,
    redirectUri: args.redirectUri,
    responseType: "code",
    scope: args.scope,
    state: args.state,
  });
  return resp.data;
}

/** M04.F03.I02: 用 authorization_code 换 access_token + refresh_token。 */
export async function oauthExchangeCode(args: {
  code: string;
  clientId: string;
  redirectUri: string;
}): Promise<TokenResponsePersisted> {
  const resp = await oAuthToken({
    grantType: "authorization_code",
    code: args.code,
    clientId: args.clientId,
    redirectUri: args.redirectUri,
  });
  persistTokens(resp.data);
  return resp.data;
}

/** M04.F03.I03: refresh_token 轮换——返回新 token，旧 refresh 一次性消费。 */
export async function oauthRefresh(args: {
  refreshToken: string;
  clientId: string;
}): Promise<TokenResponsePersisted> {
  const resp = await oAuthToken({
    grantType: "refresh_token",
    refreshToken: args.refreshToken,
    clientId: args.clientId,
  });
  persistTokens(resp.data);
  return resp.data;
}

export interface TokenResponsePersisted {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
  userId: string;
  clientId: string;
  tenantId: string;
}

/** 写入 localStorage（与 saas-react 现有 PersistedSession 字段兼容）。 */
export function persistTokens(tokens: TokenResponsePersisted): void {
  const raw = window.localStorage.getItem(SESSION_KEY);
  let session: Record<string, unknown>;
  if (raw) {
    try {
      session = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      session = {};
    }
  } else {
    session = {};
  }
  session.accessToken = tokens.accessToken;
  session.refreshToken = tokens.refreshToken;
  session.tokenType = tokens.tokenType;
  session.expiresIn = tokens.expiresIn;
  session.clientId = tokens.clientId;
  session.tenantId = tokens.tenantId;
  session.userId = tokens.userId;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** 清 tokens（登出场景）。 */
export function clearTokens(): void {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  let session: Record<string, unknown>;
  try {
    session = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    session = {};
  }
  delete session.accessToken;
  delete session.refreshToken;
  delete session.tokenType;
  delete session.expiresIn;
  delete session.tenantId;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
