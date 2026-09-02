# CLAUDE.md — SaaS身份平台React前端

> 书稿配套仓 + harness 门禁仓双身份。入口，不是手册。L0 门强制上限 60 行。
> 本仓为《（书稿信息待补）》案例（待补）的可运行配套工程，是书稿代码块的 **source of truth**。

## 1. 项目定位

SaaS 多租户多应用身份平台的 React 前端。v0.2.0 自己 orval，v0.3.0 后端配置塌缩到 env（ADR-0014）。
默认对接 springboot（:5105）；跨仓约定见 vue 仓（vue→aspnetcore :5104）。
dev server 端口：**5102**（2026-09-02 端口分段 §6；saas 段 X02）。
端口表见 `docs/conventions/env.md` §跨仓端口约定。

## 2. 铁律

- **TDD**：先写失败测试 → 确认红 → 实现 → 确认绿 → commit
- **版本钉死**：依赖与 `version-lock.json` 的 `version_lock` 一致；不引入 lock 外的库
- **tag 即放行**：全量回归绿后打 `v<MAJOR>.<MINOR>.<PATCH>-<YYYYMMDD>`（如 `v0.3.23-20260824`）
- **mock-friendly**：`npm install && npm test` 无 Key、无 Docker、无网全绿
- **功能清单是锚点**：改 function-tree 走 `/tree-change`；同 commit；废弃只改状态，编号不复用
- 禁止从 shared import TS 客户端 / 加 `@saas/shared` alias（shared 已瘦身，只产 OpenAPI.yaml）
- 禁止运行时切后端 / 恢复 BackendProvider 系（ADR-0014 已废弃）；
  `VITE_API_BASE_URL` / `VITE_ENABLE_MSW` / `VITE_API_MODE` 必须写 `.env.example`
- 禁止组件内直接 fetch（走 orval 具名函数）；禁止 `vi.mock('axios')`；禁止 axios 升 1.19
- 禁止给按钮加图标（纯文字按钮；保留清单见迁移指南）
- 禁止 `useState(emptySession)+useEffect(loadSession)`（Provider 必须 lazy initializer 同步 hydrate）
- 禁止 demo 密码出现在 UI / 注释 / 测试断言
- 细则（shadcn/ui、data-fn 登记等）→ `docs/conventions/`

## 3. 技术栈与版本（钉死于 version-lock.json）

React 19 + Vite + TS 5.7 + shadcn/ui + Tailwind v4 + orval(axios) + zod/ajv。明细见 `version-lock.json`。

门禁命令见 `.harness/stack.json`。**不要改它来让门变松。**

## 4. 验收

- suite 根目录跑 `python scripts/gate.py -p saas-identity-platform-react`
- 改了 shared → `npm run gen:shared`

## 5. 指向别处

- shared 仓 → `../saas-identity-platform-shared`（只读 OpenAPI）；msw 仓 → `../saas-identity-platform-msw`
- 迁移指南 → `docs/saas-identity-platform-v0.{2.0,3.0}-*.md`
- 决策 → `docs/adr/`；细则 → `docs/conventions/`；待办 → `PLAN.md`；版本 → `CHANGELOG.md`

## 6. 工作循环

1. 改 UI（`src/pages/<module>/*.tsx`）；最小改动
2. gate exit 1 修；exit 2 停下问人
3. `/handoff` 更新 `.state/session.json`
