// M01.F04.I03 — 账号密码登录（独立布局：登录页绕过 AppShell）
//
// 提交：调 useSessionsLogin（orval hook；LoginRequest 契约 clientId required）；
// 成功后写 tenant-context session；失败：toast.error（sonner，本页自挂 <Toaster/>）。
// 演示账号：见页面底部（密码不再公开展示，需通过公众号 / 小红书获取）。
//
// clientId 门（B 方案 2026-09-11，对齐 vue 基准）：?client_id= ?? env VITE_LOGIN_CLIENT_ID
// （值 = saas-console 自身应用）；两者皆缺 → toast 拒绝，不发请求。
//
// SSO 返回（OAuth 2.0 授权码模式，RFC 6749）：URL 带 ?code=&redirect_uri=&state=
// （lab RP 经 /api/auth/sso/authorize 领 code 后跳来）。saas 认证资源所有者后，
// 302 redirect_uri?code&state（§4.1.2）原样透传给 RP。镜像 saas-nextjs app/login。

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { useTenant } from "@/state/tenant-context";
import { getApiMode, getSelectedBackend } from "@/api/backend-config";
import { BackendBadge } from "@/components/app/backend-badge";
// 2026-09-11 ④：authorize 切真源（barrel 死桩会假成功跳 RP——假 code）
import { useOAuthAuthorize } from "@/api/endpoints/oauth/oauth";
import { useSessionsLogin } from "@/api/endpoints/auth/auth";
import { toApiError } from "@/api/http-client";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { username: "alice", tenant: "ACME Corp" },
  { username: "bob", tenant: "ACME Corp" },
  { username: "dave", tenant: "Globex Industries" },
  { username: "eve", tenant: "Initech" },
];

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, currentTenantId } = useTenant();
  const apiMode = getApiMode();
  const navigate = useNavigate();
  const loginMut = useSessionsLogin();

  // B 方案：clientId 取 ?client_id= ?? env（saas-console 自身应用）。
  // 禁 fallback 到 demo 字面量（ADR-0019）——缺即拒，不猜。
  const loginClientId = useMemo(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("client_id");
    if (fromUrl) return fromUrl;
    const fromEnv = (import.meta.env.VITE_LOGIN_CLIENT_ID ?? "").trim();
    if (fromEnv) return fromEnv;
    return "";
  }, []);
  const authorizeMut = useOAuthAuthorize();
  // RFC 6749 §4.1.1 授权码范式：lab 后端（confidential client）已替浏览器领到 code，
  // saas 登录页只负责认证资源所有者，成功后 302 redirect_uri?code&state（§4.1.2）。
  const [oauthReturn, setOauthReturn] = useState<{
    redirectUri: string;
    code: string;
    state: string;
  } | null>(null);

  // 解析 OAuth 2.0 authorize 回跳：?code=&redirect_uri=&state=
  // 用 window.location.search 直接读，不依赖路由的 query 时序。
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const oauthCode = sp.get("code");
    const oauthRedirect = sp.get("redirect_uri");
    if (oauthCode && oauthRedirect) {
      setOauthReturn({ redirectUri: oauthRedirect, code: oauthCode, state: sp.get("state") ?? "" });
    }
  }, []);

  // RFC 6749 §4.1.2：授权码回跳不依赖 onSubmit —— 资源所有者已登录（saas session
  // 已在）时无需再认证，解析出 code+redirect_uri 即刻回跳。否则已登录用户落在
  // 登录页没表单可提交，code 永远回不到 RP。
  useEffect(() => {
    if (!oauthReturn) return;
    try {
      const target = new URL(oauthReturn.redirectUri);
      target.searchParams.set("code", oauthReturn.code);
      if (oauthReturn.state) target.searchParams.set("state", oauthReturn.state);
      window.location.href = target.toString();
    } catch (err) {
      console.error("[SSO/login] auto oauth redirect failed:", err);
    }
  }, [oauthReturn]);

  // 2026-08-29 OAuth 2.0 跳板场景: lab RP 跳过来 ?redirect_uri=&state=&client_id=
  // (无 ?code=,因为 lab 后端不再代理调 saas authorize),已登录用户必须主动调
  // saas /api/v1/oauth/authorize 拿 code 跳回 RP。RFC 6749 §4.1.1: 资源所有者
  // 已 saas 登录 → authorize 端点用 session.UserId 签 code 绑 user/tenant
  // (saas-aspnetcore v0.3.20 已修:不再信 body.TenantId)。
  useEffect(() => {
    if (oauthReturn) return; // 已有 code,走上面的回跳逻辑
    const sp = new URLSearchParams(window.location.search);
    const redirectUri = sp.get("redirect_uri");
    const state = sp.get("state") ?? "";
    const clientId = sp.get("client_id") ?? "";
    if (!redirectUri || !clientId) return; // 非 OAuth 跳板 URL
    if (!isAuthenticated) return; // 未登录,显示表单让用户输密码
    void (async () => {
      try {
        const res = await authorizeMut.mutateAsync({
          data: {
            clientId,
            redirectUri,
            responseType: "code",
            scope: "lab.read lab.write",
            state,
          },
        });
        const target = new URL(redirectUri);
        target.searchParams.set("code", res.data.code);
        if (state) target.searchParams.set("state", state);
        window.location.href = target.toString();
      } catch (err) {
        console.error("[SSO/login] oauth authorize (logged-in user) failed:", err);
        // 留在登录页让用户手动重试输密码
      }
    })();
  }, [oauthReturn, isAuthenticated, currentTenantId, authorizeMut]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginClientId) {
      toast.error("缺少 clientId：请通过 OAuth 跳转访问，或配置 VITE_LOGIN_CLIENT_ID");
      return;
    }
    setSubmitting(true);
    try {
      const res = await loginMut.mutateAsync({
        data: { username, password, clientId: loginClientId },
      });
      const { accessToken, refreshToken } = res.data;
      if (!accessToken || !refreshToken) {
        toast.error("登录响应缺少 token，请联系管理员");
        return;
      }
      login({
        accessToken,
        refreshToken,
        userId: res.data.user?.id ?? "",
        username,
        email: res.data.user?.email,
        currentTenantId: res.data.availableTenants?.[0]?.tenantId ?? "",
      });
      // OAuth 2.0 code 回跳：把 code+state 原样透传给 RP 的 redirect_uri。
      // 用 setTimeout(0) 让 React 先把 setSession 的 re-render 跑完之后再做导航，
      // 避免与路由跳转竞争（saas-nextjs 同款）。
      setTimeout(() => {
        if (oauthReturn) {
          try {
            const target = new URL(oauthReturn.redirectUri);
            target.searchParams.set("code", oauthReturn.code);
            if (oauthReturn.state) target.searchParams.set("state", oauthReturn.state);
            window.location.href = target.toString();
          } catch (err) {
            console.error("[SSO/login] oauth redirect build failed:", err);
            toast.error("OAuth 回跳 URL 构造失败");
          }
          return;
        }
        // 2026-08-29 OAuth 跳板: 用户手动输密码登录 (无 ?code= 但有 ?redirect_uri=&state=&client_id=),
        // 登录成功后调 saas /api/v1/oauth/authorize 拿 code 跳回 RP (不跳 /tenants)。
        // 镜像 useEffect 跳板分支,但触发点是 onSubmit 而非 hydrate。
        const sp = new URLSearchParams(window.location.search);
        const redirectUri = sp.get("redirect_uri");
        const state = sp.get("state") ?? "";
        const clientId = sp.get("client_id") ?? "";
        if (redirectUri && clientId) {
          void (async () => {
            try {
              const authRes = await authorizeMut.mutateAsync({
                data: {
                  clientId,
                  redirectUri,
                  responseType: "code",
                  scope: "lab.read lab.write",
                  state,
                },
              });
              const target = new URL(redirectUri);
              target.searchParams.set("code", authRes.data.code);
              if (state) target.searchParams.set("state", state);
              window.location.href = target.toString();
            } catch (err) {
              console.error("[SSO/login] oauth authorize (after submit) failed:", err);
              // 兜底: 留在登录页(让用户重试)
            }
          })();
          return;
        }
        navigate("/tenants");
      }, 0);
    } catch (err) {
      const apiErr = toApiError(err);
      // M01.F04.I02 - 423 = 失败 5 次锁定（后端 15min 自动解锁）
      const msg =
        apiErr.status === 423
          ? "账号已被锁定，请 15 分钟后再试"
          : apiErr.status === 401
            ? "用户名或密码错误"
            : apiErr.status === 0
              ? // 显示实际请求目标（选择器可切，env 标签会误导）：未选择 = env 默认
                `后端不可达（${getSelectedBackend() || `${apiMode}·env 默认`}）：${apiErr.message}`
              : apiErr.message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4">
      {/* 登录页独立于 AppShell（其内才有全局 <Toaster/>）——错误 toast 靠这里自挂 */}
      <Toaster />
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">SaaS 多租户多应用身份平台</CardTitle>
          <CardDescription>使用账号密码登录管理控制台</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting} data-fn="M01.F04.I03">
              {submitting ? "登录中…" : "登录"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t space-y-4">
            {/* 获取密码说明：不再展示 demo 密码，引导关注公众号 / 小红书 */}
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs space-y-2">
              <p className="font-medium text-amber-900">🔐 演示账号密码不公开</p>
              <p className="text-amber-800 leading-relaxed">
                如需体验，请通过下方任一方式获取最新演示密码：
              </p>
              <ul className="space-y-1 text-amber-800">
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold shrink-0">
                    微
                  </span>
                  <span>
                    关注微信公众号{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">
                      南荣相如
                    </code>
                    ，回复「演示」
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shrink-0">
                    书
                  </span>
                  <span>
                    关注小红书{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">
                      @南荣相如
                    </code>
                    ，查看置顶笔记
                  </span>
                </li>
              </ul>
            </div>

            {/* 2026-09-12：静态 env 标签 → BackendBadge 切换器（dev 诊断，
                选择持久化 localStorage，下一个请求即生效，含登录 POST 本身） */}
            <div className="space-y-1">
              <p className="text-xs text-slate-400">后端模式（切换后下一个请求即生效）</p>
              <BackendBadge variant="plain" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
