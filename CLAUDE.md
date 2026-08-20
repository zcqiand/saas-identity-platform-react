# saas-identity-platform-react

> React 19 + Vite + TS 5.6 + shadcn/ui + Tailwind v4。**v0.2.0 自己 orval**，v0.3.0 后端配置塌缩到 env（ADR-0014 — 完全镜像 saas-identity-platform-nextjs）。

## 1. 这是什么

saas-identity-platform 的 React 前端（已落地 v0.2.0 迁移 + v0.3.0 env 驱动）。

- **MSW**：走 `@saas/identity-platform-msw` 共享 mock 仓（devDep）
- **API client**：本仓 `orval.config.ts` 读 `../saas-identity-platform-shared/generated/openapi/openapi.yaml` → `src/api/endpoints/{endpoints,endpoints.schemas}.ts`
- **后端配置**：env-driven 单 URL（ADR-0014 — 完全镜像 saas-identity-platform-nextjs）
  - `src/api/env.ts` 唯一 `import.meta.env.VITE_*` 适配点
  - `src/api/backend-config.ts` 3 个 getter：`getApiBaseUrl` / `getApiMode` / `isMswEnabled`
  - 运行时不再切后端（删 BackendProvider / useBackend / BackendSwitcher）
  - MSW 启动门控走 `VITE_ENABLE_MSW`（dev 默认 true / prod 默认 false）
  - **跨仓约定**：react 仓默认 → springboot (:8080)；vue 仓默认 → aspnetcore (:5000)
  - **env 三层**：`.env.example`（committed 模板）/ `.env.local`（gitignored，dev 真后端）/ `.env.test`（committed，vitest MSW 隔离）
- **运行时校验**：zod（v0.2.0 在 `package.json dependencies` 引入，作为兜底）

## 2. 禁止事项（v0.3.0 hard rules — ADR-0014 已反转「禁止 env」规则）

- ❌ 禁止从 `@saas/identity-platform-shared` import TS 客户端（shared 仓已删除 TS 产物；只产 OpenAPI.yaml）
- ❌ 禁止给 vite/webpack 加 `"@saas/shared"` alias（指向 `shared/generated/ts`，shared 仓瘦身后会 vite 解析失败）
- ❌ **禁止**运行时切后端 / 禁止恢复 BackendProvider / BackendSwitcher / useBackend / localStorage["saas.backend"]（**v0.3.0 已废弃**）
- ❌ **必须**把 `VITE_API_BASE_URL` / `VITE_ENABLE_MSW` / `VITE_API_MODE` 写到 `.env.example`，部署平台覆盖 — ADR-0014
- ❌ 禁止给按钮加图标（`Plus` / `Trash2` / `Power` / `ShieldCheck` / `Save` / `X` / `LogIn` / `Download`）—— 用户明确要求**纯文字按钮**（保留：`Check` / `ChevronRight` / `FolderTree` / `LogOut` / `Server`）
- ❌ 禁止用 `useState(emptySession) + useEffect(loadSession)` —— tenant / selection 两个 Provider 必须 lazy initializer 同步 hydrate
- ❌ 禁止手写 fetch + 字符串 URL —— 一律走 `adminTenantsCreateTenant(body)` 等 orval 具名函数
- ❌ 禁止 `vi.mock('axios')` 来 mock API —— orval 加载时会崩，`shared` 模块初始化失败只剩 `getTitle` 一个 export
- ❌ 禁止 axios 升 1.19 —— orval 7 类型推断会挂（`AxiosResponseResult` 不兼容）
- ❌ 禁止在 shared 仓把 `@tanstack/react-query` 列在 `dependencies`（改放 `devDependencies`，让消费方自己装框架对应的包）
- ❌ 禁止 demo 密码（`demo123` / `DEMO_PASSWORD` 等）出现在 UI / 注释 / 测试断言

## 3. 4 个核心基建文件（v0.3.0 — ADR-0014）

| 文件 | 职责 |
| --- | --- |
| `src/api/env.ts` | 唯一 `import.meta.env.VITE_*` 适配点（v0.3.0 新增） |
| `src/api/backend-config.ts` | env 适配：`getApiBaseUrl` / `getApiMode` / `isMswEnabled`（v0.3.0 塌缩到 3 个函数） |
| ~~`src/state/backend-context.tsx`~~ | ~~React Context；同步 hydrate 单例；useBackend() hook~~（v0.3.0 删除 — ADR-0014） |
| ~~`src/components/app/backend-switcher.tsx`~~ | ~~sidebar 底部 DropdownMenu + 自定义 baseUrl 编辑~~（v0.3.0 删除 — ADR-0014） |
| `src/components/app/backend-badge.tsx` | 无交互 backend 标签（v0.3.0 替代 BackendSwitcher — ADR-0014） |
| `src/components/app/crud-dialog.tsx` | 通用 CRUD Dialog；`fields: FieldDef[]` 驱动；支持 text/textarea/select/checkbox |

## 4. 指向别处

- shared 仓：`../saas-identity-platform-shared`（**只读 `generated/openapi/openapi.yaml`**）
- msw 仓：`../saas-identity-platform-msw`（`@saas/identity-platform-msw`，handler 在那边）
- 迁移指南：`docs/saas-identity-platform-v0.2.0-migration.md`（vue / nextjs / 后续 session 必读）
- 迁移指南（v0.3.0 env 驱动）：`docs/saas-identity-platform-v0.3.0-env-driven-migration.md`（v0.3.0 新增）
- function-tree：`docs/functions/function-tree.md`

## 5. 工作循环

1. 改 UI（`src/pages/<module>/*.tsx`）
2. 改了 shared？→ `npm run gen:shared`（orval 读 yaml 重生成本仓 `src/api/endpoints/`）
3. `python scripts/gate.py -p saas-identity-platform-react`