import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { TenantProvider } from "./state/tenant-context";
import { SelectionProvider } from "./state/selection-context";
import "./index.css";

// ADR-0014：运行时不再切后端；MSW 是否启用走 VITE_ENABLE_MSW（部署期 env）。
async function bootstrap() {
  if (import.meta.env.DEV) {
    const { enableMocking } = await import("./mocks/browser");
    await enableMocking();
  }
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