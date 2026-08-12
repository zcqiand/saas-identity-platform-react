import { defineConfig } from "orval";

// orval config (in react 仓) — generates TS api-client from shared's OpenAPI.yaml.
//
// Source contract lives in shared 仓 at ../saas-identity-platform-shared/generated/openapi/openapi.yaml.
// This file is owned by react 仓; other frontends (vue / nextjs / kotlin-android) have their own copy.
export default defineConfig({
  saas: {
    input: "../saas-identity-platform-shared/generated/openapi/openapi.yaml",
    output: {
      mode: "split",
      target: "./src/api/endpoints/endpoints.ts",
      client: "react-query",
      override: {
        useDates: false,
        query: {
          useQuery: true,
          useInfinite: false,
          useSuspenseQuery: false,
          signal: true,
        },
      },
    },
  },
});