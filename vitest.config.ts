import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import FnReporter from "./tests/fnReporter";

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: false,
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // 本仓 orval 生成的 src/api/endpoints/endpoints.ts 引 @tanstack/react-query + axios。
    // 预打包，确保 import analysis 能解析。（@saas/identity-platform-msw 已随
    // msw 剔除 Phase 2 从依赖与拦截面移除。）
    include: ["./src/api/endpoints/endpoints", "./src/api/endpoints/endpoints.schemas"],
  },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 10000,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default", new FnReporter() as any],
    // jsdom url 与真后端 :5101 同源——jsdom 的 XHR 对跨源响应按网络错误处理
    // （lab-react T7 实测：baseUrl=:5201 而默认 url=:3000 时 dom 测试全挂）。
    environmentOptions: { jsdom: { url: "http://localhost:5101" } },
    server: {
      deps: {
        inline: [/\/src\/api\/endpoints\//],
      },
    },
  },
});
