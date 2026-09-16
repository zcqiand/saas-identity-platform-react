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
    // T11(2026-09-16)：文件默认并行下 role-menu-grant 的 TEST- 建角色写测试与
    // role-list「恰 2 行」种子锚并发读写共享真库 → 瞬态 3 行假红（gate 实证）。
    // 共享真后端 + 真库 = 共享可变状态，文件必须串行。
    fileParallelism: false,
    // 真链路 jsdom 测试吃真 nextjs dev 冷编译（单路由 10-20s 常态），10s 恒误报。
    testTimeout: 30000,
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
