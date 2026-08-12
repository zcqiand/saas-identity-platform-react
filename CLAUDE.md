# saas-identity-platform-react

> React 19 + Vite + TS 5.6 + shadcn/ui + Tailwind v4。**v0.2.0 自己 orval**，不再 `file:` 依赖 shared 仓 TS 产物。

## 1. 这是什么

saas-identity-platform 的 React 前端（已落地 v0.2.0 迁移）。

- **MSW**：走 `@saas/identity-platform-msw` 共享 mock 仓（devDep）
- **API client**：本仓 `orval.config.ts` 读 `../saas-identity-platform-shared/generated/openapi/openapi.yaml` → `src/api/endpoints/{endpoints,endpoints.schemas}.ts`
- **运行时后端切换**：模块级单例 `src/api/backend-config.ts` + React Context `src/state/backend-context.tsx`；msw / aspnetcore / springboot 三模式可运行时切换，不需 rebuild
- **运行时校验**：zod（v0.2.0 在 `package.json dependencies` 引入，作为兜底）

## 2. 禁止事项（v0.2.0 hard rules）

- ❌ 禁止从 `@saas/identity-platform-shared` import TS 客户端（shared 仓已删除 TS 产物；只产 OpenAPI.yaml）
- ❌ 禁止给 vite/webpack 加 `"@saas/shared"` alias（指向 `shared/generated/ts`，shared 仓瘦身后会 vite 解析失败）
- ❌ 禁止把后端模式写到 `.env` / `.env.example` / `vite.config.ts` proxy —— 切模式必须 runtime 可改，不需 rebuild
- ❌ 禁止给按钮加图标（`Plus` / `Trash2` / `Power` / `ShieldCheck` / `Save` / `X` / `LogIn` / `Download`）—— 用户明确要求**纯文字按钮**（保留：`Check` / `ChevronRight` / `FolderTree` / `LogOut` / `Server`）
- ❌ 禁止用 `useState(emptySession) + useEffect(loadSession)` —— 刷新跳登录（tenant / selection / backend 三个 Provider 必须 lazy initializer 同步 hydrate）
- ❌ 禁止手写 fetch + 字符串 URL —— 一律走 `adminTenantsCreateTenant(body)` 等 orval 具名函数
- ❌ 禁止 `vi.mock('axios')` 来 mock API —— orval 加载时会崩，`shared` 模块初始化失败只剩 `getTitle` 一个 export
- ❌ 禁止 axios 升 1.19 —— orval 7 类型推断会挂（`AxiosResponseResult` 不兼容）
- ❌ 禁止在 shared 仓把 `@tanstack/react-query` 列在 `dependencies`（改放 `devDependencies`，让消费方自己装框架对应的包）
- ❌ 禁止 demo 密码（`demo123` / `DEMO_PASSWORD` 等）出现在 UI / 注释 / 测试断言

## 3. 4 个核心基建文件（其他 6 仓镜像迁移时要复制这 4 个）

| 文件 | 行数 | 职责 |
| --- | --- | --- |
| `src/api/backend-config.ts` | 53 | 模块级单例；7 个 getter/setter；hydrate/snapshot 双向桥 |
| `src/state/backend-context.tsx` | 130 | React Context；同步 hydrate 单例；`useBackend()` hook |
| `src/components/app/backend-switcher.tsx` | 142 | sidebar 底部 DropdownMenu + 自定义 baseUrl 编辑 |
| `src/components/app/crud-dialog.tsx` | 184 | 通用 CRUD Dialog；`fields: FieldDef[]` 驱动；支持 text/textarea/select/checkbox |

## 4. 指向别处

- shared 仓：`../saas-identity-platform-shared`（**只读 `generated/openapi/openapi.yaml`**）
- msw 仓：`../saas-identity-platform-msw`（`@saas/identity-platform-msw`，handler 在那边）
- 迁移指南：`docs/saas-identity-platform-v0.2.0-migration.md`（vue / nextjs / 后续 session 必读）
- function-tree：`docs/functions/function-tree.md`

## 5. 工作循环

1. 改 UI（`src/pages/<module>/*.tsx`）
2. 改了 shared？→ `npm run gen:shared`（orval 读 yaml 重生成本仓 `src/api/endpoints/`）
3. `python scripts/gate.py -p saas-identity-platform-react`
