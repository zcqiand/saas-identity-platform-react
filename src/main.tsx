import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { TenantProvider } from "./state/tenant-context";
import { SelectionProvider } from "./state/selection-context";
import "./index.css";

// ADR-0012 v0.3.0：删除 SW bootstrap（Service Worker 模式完全删除）。
// dev 路径走 msw-http 独立 HTTP server（@saas/identity-platform-msw/src/server.ts 起 :5174）。
async function bootstrap() {
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