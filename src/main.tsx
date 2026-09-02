import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { TenantProvider } from "./state/tenant-context";
import { SelectionProvider } from "./state/selection-context";
import { installHttpClient } from "./api/http-client";
import "./index.css";

// ADR-0012 v0.3.0：删除 SW bootstrap（Service Worker 模式完全删除）。
// dev 路径走 msw-http 独立 HTTP server（@saas/identity-platform-msw/src/server.ts 起 :5100）。
async function bootstrap() {
  // v0.3.20 起 (fix login 405): 必须装 axios interceptor 才能让 orval 生成的
  // `axios.post('/api/v1/auth/login', ...)` 走 baseURL (http-client.ts:42 installHttpClient
  // 函数定义后从未被调用 → axios baseURL 一直是 undefined → 相对 URL 落到当前 origin
  // = saas-react 自己 host, VPS nginx 给 405 Method Not Allowed).
  // token getter 从 localStorage["saas.tenant"] (tenant-context 写入) 读 accessToken;
  // 没 token 时返回 null = 无 Authorization 头 (对应 /api/v1/auth/** permitAll 不需要).
  installHttpClient(() => {
    try {
      const raw = window.localStorage.getItem("saas.tenant");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const t = parsed.accessToken;
      return typeof t === "string" && t.length > 0 ? t : null;
    } catch {
      return null;
    }
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 5_000 } },
  });
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          <SelectionProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SelectionProvider>
        </TenantProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

bootstrap();