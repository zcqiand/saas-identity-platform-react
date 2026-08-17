import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// Vite 在 import.meta.env 注入前的早期 phase 读 process.env。
// VITE_DEV_PORT 走 .env.local（见 .env.example）；默认 5173。
const devPort = Number(process.env.VITE_DEV_PORT ?? "5173") || 5173;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: devPort,
    // saas CLAUDE.md 硬约束：vite 8.2.1 默认 forwardConsole=void 0 走 agent 检测路径
    // 会产生 __SERVER_FORWARD_CONSOLE__ ReferenceError；显式关掉走 JSON-serializable 分支。
    forwardConsole: false,
  },
  optimizeDeps: {
    // msw v2 has unresolvable @mswjs/interceptors exports conditions for
    // ClientRequest in browser; exclude from pre-bundling so it loads at
    // runtime via esm rather than being bundled by esbuild.
    exclude: ["@saas/identity-platform-msw", "msw", "@mswjs/interceptors"],
  },
});