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
    // 预打包，确保 import analysis 能解析。
    include: ["./src/api/endpoints/endpoints", "./src/api/endpoints/endpoints.schemas", "@saas/identity-platform-msw"],
  },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 10000,
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default", new FnReporter() as any],
    server: {
      deps: {
        inline: [/\/src\/api\/endpoints\//, /@saas\/identity-platform-msw/],
      },
    },
  },
});
