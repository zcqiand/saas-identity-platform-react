import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@saas/shared": resolve(__dirname, "../saas-identity-platform-shared/generated/ts"),
      "@": resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // msw v2 has unresolvable @mswjs/interceptors exports conditions for
    // ClientRequest in browser; exclude from pre-bundling so it loads at
    // runtime via esm rather than being bundled by esbuild.
    exclude: ["@saas/identity-platform-msw", "msw", "@mswjs/interceptors"],
  },
});
