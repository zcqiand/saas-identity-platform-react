import { defineConfig } from "orval";

// orval config (in react 仓) — generates TS api-client from shared's OpenAPI.yaml.
//
// Architecture (ADR-0026 §10 配套，PR #8 pilot):
// - mode: "tags-split" — 按 shared tsp 的 @tag 拆成多文件，schemas 抽到 model/ 子目录
// - target: 目录（不是文件）—— orval tags-split 必须 dir，不能 file
// - schemas: 单独 model/ 目录—— schemas 跨 tag 复用，集中放便于 import + tree-shaking
//
// 原配置：mode="split" + target 是文件 → orval 实际等同于 single，全塞 endpoints.ts。
// 弊端（用户指南总结）：
//   1. 单文件 3000+ 行，IDE 卡顿 + 类型检查慢
//   2. 多人协作 git merge conflict 重灾区
//   3. tree-shaking 失效，bundle 大
//   4. shared 删 namespace → 整文件失效 → orphan pages 编译失败但 grep 不到原因
//
// 新配置按 shared 的 11 个 @tag 拆：
//   src/api/endpoints/admin-tenants.ts
//   src/api/endpoints/admin-clients.ts
//   src/api/endpoints/oauth.ts
//   src/api/endpoints/auth.ts
//   ... (11 个 tag × 1 个文件)
//   src/api/endpoints/model/  ← schemas 集中
//
// 此文件 owned by react 仓；其他前端（vue / nextjs）有自己独立副本。
export default defineConfig({
  saas: {
    input: "../saas-identity-platform-shared/generated/openapi/openapi.yaml",
    output: {
      mode: "tags-split",
      target: "./src/api/endpoints",
      schemas: "./src/api/endpoints/model",
      // clean：生成前清空目标目录（2026-09-17 SSOT 清理）——tags-split 不会删除
      // 已从契约移除的 tag 旧目录/旧模型，残留死 hooks 固化进仓库。整个 endpoints/
      // 目录 must stay orval-owned：手写 barrel（endpoints.ts / endpoints.schemas.ts）
      // 已迁出到 src/api/ 下，不得混回。
      clean: ["./src/api/endpoints"],
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