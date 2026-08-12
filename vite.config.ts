import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@saas/shared": resolve(__dirname, "../saas-identity-platform-shared/generated/ts"),
    },
  },
});