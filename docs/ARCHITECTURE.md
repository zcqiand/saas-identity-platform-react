# saas-identity-platform-react Architecture

> 本仓 = 多租户 SaaS 身份管理平台（saas-identity-platform）的 React 前端。
> 技术栈：**React 19 + Vite 5 + TypeScript 5.6 + shadcn/ui + Tailwind v4 + orval 7 + axios + @tanstack/react-query**。
> 走 openapi → orval → axios + baseURL 的全链路，env-driven 单 URL 后端配置（ADR-0014 — 完全镜像 `saas-identity-platform-nextjs`）。

> **范围**：本文档只描述本仓架构（结构 / 边界 / 数据流 / 决策）。
> 编码细则见父仓 `docs/conventions/`、产品需求见 `docs/functions/function-tree.md`、跨仓流程见父仓 `docs/ARCHITECTURE.md`。

---

## 0. 阅读路径

| 你是… | 直接看 |
|---|---|
| 新人，要 30 分钟搞懂本仓 | §1 → §2 → §4（核心流程） |
| 想加新页面 / 新功能 | §3（核心模块）→ CLAUDE.md「工作循环」→ `function-tree.md` |
| 想改后端配置 / 切真后端 | §1.3 → §4.2 → §5（v0.3.0 关键基建） |
| 想问「为什么这样设计」 | §6（决策索引）→ 对应 ADR / 父仓 `docs/ARCHITECTURE.md` |
| 想了解跨仓家族拓扑 | 附录 A |

---

## 1. 角色与定位

### 1.1 在多仓家族中的位置

本仓是 `saas-identity-platform-*` 家族的 **前端 1/3**（另有 `vue` 与 `nextjs`）。

```
saas-identity-platform-shared   ← 契约源（API + DB schema，TypeSpec emit openapi.yaml）
        │
        ├─→ saas-identity-platform-msw       ← Mock 后端 HTTP 服务（ADR-0012 B 强度，:5100）
        │
        ├─→ saas-identity-platform-react     ← 本仓（React 19 + Vite + orval，:5102）
        ├─→ saas-identity-platform-vue       （:5103）
        └─→ saas-identity-platform-nextjs    （:5101，兼全栈后端）

        ├─→ saas-identity-platform-springboot   ← 后端 1/2（:5105）
        └─→ saas-identity-platform-aspnetcore    ← 后端 2/2（:5104）
```

**本仓不是孤岛**——它只消费两样东西：

| 上游 | 产物 | 消费方式 |
|---|---|---|
| `saas-identity-platform-shared` | `generated/openapi/openapi.yaml` | `orval.config.ts` 读取 → 本仓 `src/api/endpoints/`（gitignored） |
| `saas-identity-platform-msw` | HTTP server `:5100` + handlers + fixtures | dev 运行时通过 `VITE_API_BASE_URL` 指向 |

**本仓不生产**：API 契约、SQL schema、handlers、fixtures、Spring Boot / .NET 后端代码、跨仓对齐规则——这些都在别处。

### 1.2 技术栈关键事实

| 维度 | 选择 | 备注 |
|---|---|---|
| UI 框架 | React 19 | 函数组件 + hooks；无 class 组件 |
| 构建 | Vite 5 | dev = `vite --port 5102`；build = `tsc -b && vite build` |
| 类型 | TypeScript 5.6 | `tsconfig.json` strict |
| 样式 | Tailwind v4 + shadcn/ui | 底座在 `src/components/ui/`（15 个 primitive）；业务组合在 `src/components/app/` |
| 路由 | react-router-dom v6+ | `BrowserRouter` + `Routes` / `<Route>` + `<Outlet>` |
| 数据获取 | `@tanstack/react-query` | orval codegen 选 `client: "react-query"`（见 `orval.config.ts`） |
| HTTP 客户端 | axios | `installHttpClient()` 拦截器注入 baseURL + Bearer token |
| API codegen | orval 7 | 读 yaml → `src/api/endpoints/{endpoints,endpoints.schemas}.ts` |
| 状态 | React Context（Tenant / Selection） | 同步 hydrate from localStorage（lazy initializer） |
| 后端配置 | env-driven 单 URL | ADR-0014；详见 §5 |
| runtime 校验 | zod | devDep 兜底 |
| npm 源 | `registry.npmmirror.com` | `.npmrc` 强制 |

### 1.3 后端配置：env-driven 单 URL（ADR-0014 — 完全镜像 nextjs）

**v0.3.0** 彻底反转了 v0.2.0 时代「运行时切后端」的形态：

```ts
// src/api/env.ts（本仓唯一的 import.meta.env 适配点）
export const env = {
  VITE_API_BASE_URL: readEnv("VITE_API_BASE_URL", ""),
  VITE_ENABLE_MSW: ...,
  VITE_API_MODE: readEnv("VITE_API_MODE", "msw"),
} as const;

// src/api/backend-config.ts（3 个 getter，UI 仅读不可写）
export function getApiBaseUrl(): string {
  return env.VITE_API_BASE_URL || "http://localhost:5100";
}
export function getApiMode(): string {
  return env.VITE_API_MODE || "msw-http";
}
```

要点：

- **运行时不再切**：删除 `BackendProvider` / `useBackend` / `BackendSwitcher` 整套；
- **部署期切换**：改 `.env.production` / 部署平台环境变量，build 后冻结；
- **跨仓约定**：本仓默认 → `springboot (:5105)`（react 仓惯例），vue 默认 → `aspnetcore (:5104)`；
- **MSW 启动**：v0.3.0 后 **Service Worker 模式完全删除**——dev 路径只走 msw-http（独立 HTTP server，`:5100`），`VITE_ENABLE_MSW` 仅 env 留位但已被 ADR-0014 v0.3.20 删去，UI 走 `getApiMode()` 标签判断。

### 1.4 与 nextjs 仓的对称性

本仓 v0.3.0 是 **完全镜像** `saas-identity-platform-nextjs` 的 env 驱动形态：

| 维度 | react（本仓） | nextjs |
|---|---|---|
| env 前缀 | `VITE_*` | `NEXT_PUBLIC_*` |
| 后端配置 3 函数 | `getApiBaseUrl` / `getApiMode` / `isMswEnabled` | 同名同构 |
| 持久化 session key | `localStorage["saas.tenant"]` | cookie |
| 数据获取 hook | `@tanstack/react-query` (orval) | `@tanstack/react-query` (orval) |
| 后端路由模式 | SPA + axios 绝对 URL | 同 origin server actions + 客户端 fetch |

详见父仓 `docs/conventions/multi-repo-family.md` §4。

---

## 2. 目录骨架

```
saas-identity-platform-react/
├── CLAUDE.md                          ← 入口：技术栈 + 禁止事项 + 指向别处
├── .harness/stack.json                ← suite 门禁读：react-ts 配置（L1-L4）
├── .env.example                       ← committed 模板（ADR-0014）
├── .env.local                         ← gitignored，dev 真后端覆盖
├── .env.test                          ← committed，vitest 隔离
├── .env.production                    ← prod 构建时读
├── docs/
│   ├── ARCHITECTURE.md                ← 本文件
│   ├── functions/function-tree.md     ← M0x / F0y / I0z 功能清单
│   └── saas-identity-platform-v0.2.0-migration.md   ← v0.2.0 迁移指南
├── scripts/
│   └── gen-shared.ts                  ← npm run gen:shared（orval 读 yaml 重生成）
├── src/
│   ├── main.tsx                       ← bootstrap：装 axios interceptor + Provider 树
│   ├── App.tsx                        ← Routes + RequireAuth 守卫 + 9 个 <Route>
│   ├── index.css                      ← Tailwind v4 入口
│   ├── api/
│   │   ├── env.ts                     ← v0.3.0：唯一 import.meta.env 适配点
│   │   ├── backend-config.ts          ← v0.3.0：3 getter（塌缩 env 适配）
│   │   ├── http-client.ts             ← axios + installHttpClient() + ApiError
│   │   └── endpoints/                 ← orval codegen 产物（gitignored）
│   │       ├── endpoints.ts           ← ~155KB，具名函数 + react-query hook
│   │       └── endpoints.schemas.ts   ← ~13KB，DTO 类型
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui 底座（15 primitives）
│   │   ├── app/                       ← 业务底座（AppShell / SidebarNav / CrudDialog / …）
│   │   └── tenant-switcher.tsx        ← header 右上角切换租户下拉
│   ├── pages/                         ← 9 个 F.I 页面（每页对应一个 I 主项）
│   │   ├── LoginPage.tsx              ← M03.F01.I01（独立布局）
│   │   ├── TenantListPage.tsx         ← M00.F01.I01（平台租户 CRUD）
│   │   ├── UserListPage.tsx           ← M01.F01.I01
│   │   ├── RoleListPage.tsx           ← M02.F01.I01
│   │   ├── ApiKeyListPage.tsx         ← M05.F01.I01
│   │   ├── AuditListPage.tsx          ← M06.F01.I01
│   │   ├── AppListPage.tsx            ← M04.F01.I01
│   │   ├── MenuTreePage.tsx           ← M08.F01.I01
│   │   └── RoleMenuGrantPage.tsx      ← M09.F02.I02
│   ├── state/
│   │   ├── tenant-context.tsx         ← auth session (login/logout/setTenant)
│   │   └── selection-context.tsx      ← 焦点选中 (selectedTenant/selectedApp)
│   └── lib/
│       └── utils.ts                   ← cn() 工具（clsx + tailwind-merge）
├── tests/
│   ├── setup.ts
│   └── **/*.test.tsx                  ← fnTest 嵌入 fn-ID
├── orval.config.ts                    ← 读 ../shared/generated/openapi/openapi.yaml
├── vite.config.ts                     ← Vite + @ alias → src/
├── vitest.config.ts                   ← vitest + jsdom + path alias
├── package.json                       ← deps: axios/react/router-dom/...
├── Dockerfile                         ← nginx 静态构建
└── nginx.conf                         ← 反向代理 /api/* 到后端
```

---

## 3. 核心模块

### 3.1 `src/api/` —— HTTP / 配置 / codegen 产物

**职责**：唯一对外 HTTP 出口 + 后端配置 + orval 自动生成端点。

| 文件 | 角色 |
|---|---|
| `env.ts` | **唯一** `import.meta.env.VITE_*` 适配点；导出 frozen `env` 对象 |
| `backend-config.ts` | env → 业务 getter：`getApiBaseUrl()` / `getApiMode()` |
| `http-client.ts` | `axios` + `installHttpClient(getToken)`（请求拦截器：注入 baseURL + Bearer）+ `ApiError` + `toApiError(err)` + 低阶 `apiRequest(path, opts, token)` 兜底 |
| `endpoints/endpoints.ts` | orval 产物；具名函数 `authLogin()` / `adminTenantsCreateTenant()` / `getMyMenus()` 等 + react-query hook |
| `endpoints/endpoints.schemas.ts` | orval 产物；DTO 类型（与 openapi.yaml 一一对应） |

**关键约束**（CLAUDE.md §2 已列）：

- ❌ 禁手写 `fetch(path)` + 字符串 URL —— 一律 `import { authLogin } from "@/api/endpoints/endpoints"`；
- ❌ 禁 `vi.mock('axios')`（orval 加载会崩，`shared` 模块初始化失败）；
- ❌ 禁 axios 升 1.19（orval 7 类型推断挂）；
- ✅ `installHttpClient(getToken)` **必须在 `main.tsx` bootstrap 调用一次**（详见 `memory/orval-axios-baseurl-must-be-installed.md`）。

### 3.2 `src/components/app/` —— 业务底座

| 文件 | 角色 |
|---|---|
| `app-shell.tsx` | 顶栏（面包屑 + TenantSwitcher）+ 左侧 `SidebarNav` + `<Outlet>`；`useBreadcrumbs()` 拉租户列表建 `id→name` 映射 |
| `sidebar-nav.tsx` | 分组导航（首页 / 身份管理 / 平台运营 / 应用与菜单）；`NavItem.fnId` 透传 `data-fn` 给 L5 alignment；`end={true}` 精确匹配避免 `/tenants` 把 `/tenants/{id}/users` 标 active |
| `backend-badge.tsx` | **v0.3.0 新增** — sidebar 底部无交互 backend 标签（替代已废弃的 `BackendSwitcher`）；显示 `getApiMode()` + `getApiBaseUrl()` 供诊断 |
| `crud-dialog.tsx` | 通用 CRUD 弹窗；`fields: FieldDef[]` 驱动；支持 text / textarea / select / checkbox；`renderField` 插槽支持自定义控件 |
| `confirm-dialog.tsx` | 删除/危险操作的二次确认 |
| `data-table.tsx` | 列表基类（分页 / 排序 / 加载态） |
| `empty-state.tsx` | 空数据占位 |
| `field.tsx` | form field 包装（label + htmlFor + required） |
| `page-header.tsx` | 页面标题 + 描述 + 操作按钮 |
| `pagination-bar.tsx` | 分页器 |
| `status-badge.tsx` | 状态标签（active / invited / removed） |

`src/components/ui/` 则是 shadcn/ui 15 个 primitives（alert-dialog / badge / button / card / checkbox / dialog / dropdown-menu / input / label / select / separator / skeleton / sonner / table / textarea）—— 不在本架构文档展开。

### 3.3 `src/state/` —— Context Providers

| 文件 | 持久化 | 字段 | 用途 |
|---|---|---|---|
| `tenant-context.tsx` | `localStorage["saas.tenant"]` | `currentTenantId` / `tenantCode` / `accessToken` / `refreshToken` / `user` / `isAuthenticated` | auth session；`<RequireAuth>` 据此重定向 `/login` |
| `selection-context.tsx` | `localStorage["saas.selected.tenant"]` + `localStorage["saas.selected.app"]` | `selectedTenant` / `selectedApp`（id + name） | 页面级「焦点选中」；MenuTreePage 切换应用 / 跨页选择租户 |

**关键约束**（CLAUDE.md §2）：

- ❌ 禁 `useState(emptySession) + useEffect(loadSession)` —— tenant / selection 必须 lazy initializer 同步 hydrate（避免 RequireAuth 在 hydrate 完成前误判未认证并重定向 `/login`）；
- ❌ 禁 demo 密码（`demo123` / `DEMO_PASSWORD` 等）出现在 UI / 注释 / 测试断言。

### 3.4 `src/pages/` —— 各 F.I 主项

每页 = 一个 F.I 主项（"页面" 类型子项） + 调用同 F 下的 I 子项（按钮 / 接口）：

| 页面 | F | I 主项 | 调用的端点（orval 具名函数） |
|---|---|---|---|
| `LoginPage` | M03.F01 | I01 账号密码登录 | `authLogin` |
| `TenantListPage` | M00.F01 | I01 租户列表 | `adminTenantsListTenants` + CRUD 系列 |
| `UserListPage` | M01.F01 | I01 用户列表 | `adminUsersListUsers` + CRUD + `M01.F02.I01` 分配角色 |
| `RoleListPage` | M02.F01 | I01 角色列表 | `adminRolesListRoles` + CRUD |
| `ApiKeyListPage` | M05.F01 | I01 API Key 列表 | `adminApiKeys*` 系列 |
| `AuditListPage` | M06.F01 | I01 审计事件列表 | `adminAuditListEvents` |
| `AppListPage` | M04.F01 | I01 应用列表 | `adminAppsListApps` + CRUD + `M04.F02.I06` 启用/停用 |
| `MenuTreePage` | M08.F01 | I01 菜单树 | `adminMenus*` + `M08.F02.I06/I07` 排序/父级 |
| `RoleMenuGrantPage` | M09.F02 | I02 角色菜单授权 | `adminRolesGrantMenus` + `M09.F02.I03` 清空 |

每个 I 主项页面 `<header>` / `<button>` / `<a>` 上挂 `data-fn="<fnId>"`，供 L5 alignment 提取（详见父仓 ARCHITECTURE §3.7）。

### 3.5 `src/main.tsx` —— Bootstrap 入口

职责 5 步：

1. `installHttpClient(getToken)` —— axios 拦截器（v0.3.20 起必须调）；
2. `new QueryClient({ defaultOptions: { queries: { staleTime: 5_000 } } })`；
3. `ReactDOM.createRoot(document.getElementById("root")!).render(...)`；
4. Provider 树：`QueryClientProvider` → `TenantProvider` → `SelectionProvider` → `BrowserRouter` → `App`；
5. `<React.StrictMode>` 包裹。

`getToken` callback 直接读 `localStorage["saas.tenant"].accessToken`，**用 callback 避免循环依赖**（`tenant-context → http-client` 不能反向指）。

### 3.6 `src/App.tsx` —— 路由

`<Routes>` 两层：

- `/login` → `<LoginPage>`（独立布局，无 sidebar）；
- 其他 9 个路径 → `<RequireAuth>` 守卫 + `<AppShell>` 包裹 + 各自 `<Page>`。

`<RequireAuth>` 据 `useTenant().isAuthenticated` 决定 `<Navigate to="/login" replace />`。

---

## 4. 核心流程

### 4.1 启动链（dev）

```
1. 启动 msw 后端（独立进程）:
   cd output/saas-identity-platform-msw && npm start
   → http://localhost:5100   ← GET /healthz → { mode: "msw" }
   ↓

2. 启动本仓:
   cd output/saas-identity-platform-react && npm run dev
   → http://localhost:5102   ← Vite dev server
   ↓

3. 浏览器加载:
   index.html → main.tsx
   → installHttpClient(getToken)         ← 注入 baseURL = http://localhost:5100
   → QueryClientProvider + TenantProvider + SelectionProvider + BrowserRouter
   → App → Routes → /login (未登录) 或 /tenants (已登录)
   ↓

4. 用户点登录:
   <LoginPage> 调 authLogin({ username, password })
   → orval 生成的 axios.post("/api/v1/auth/login", body)
   → axios 拦截器改 config.baseURL = "http://localhost:5100"
   → 真实 HTTP 请求发到 saas-msw :5100
   → msw handlers 拦截，匹配 POST /api/v1/auth/login → 返回真 OAuth 2.0 响应（authorize/token 或 dev helper JWT）
   → 调 tenant-context.login(payload) → 写 localStorage["saas.tenant"]
   → navigate("/tenants")
   ↓

5. 后续请求:
   <UserListPage> 调 adminUsersListUsers(...)
   → 拦截器带 Authorization: Bearer <token> 头
   → msw 验签 JWT（dev helper HS256；prod 走 NimbusJwtDecoder/JWKS）
   → 返回 mock JSON
```

### 4.2 切真后端（dev 后期 / 集成测试）

```
1. 编辑 .env.local:
   VITE_API_BASE_URL=http://localhost:5105
   VITE_API_MODE=springboot
   ↓

2. 重启 npm run dev（Vite 重启加载新 env）
   → installHttpClient → getApiBaseUrl() 返回 "http://localhost:5105"
   ↓

3. 同源 SPA 跨域请求 → springboot :5105
   → springboot NimbusJwtDecoder HS256 真验签（对称密钥 JWT_SIGNING_KEY）
   → 调 shared SQL 灌过的 saas_dev DB
   → 返回真实数据

4. 后端 CORS allowlist 必须含 5102（react dev origin）
```

**反向**：本地后端 vs 部署平台后端只有 `.env*` 不同。代码、Provider、路由、所有页面不动。

### 4.3 改契约 → 本仓同步

```
1. [shared] 改 tsp/main.tsp 或 routes/*.tsp
   ↓ git commit + push

2. [shared] npm run build → emit:openapi 重新生成 openapi.yaml
   ↓ gate exit 0

3. [react] npm run gen:shared
   → bash scripts/gen-shared.ts: 调 orval 读 ../shared/generated/openapi/openapi.yaml
   → 重新生成 src/api/endpoints/{endpoints,endpoints.schemas}.ts
   ↓

4. tsc --noEmit 必须过（新加 DTO 可能影响旧调用）
   ↓

5. python scripts/gate.py -p saas-identity-platform-react
   → L1 prettier / L2 eslint / L3 tsc / L4 vitest 全绿
```

### 4.4 登录态恢复（刷新页面）

```
1. 浏览器加载 SPA
   → main.tsx → TenantProvider
   → useState(() => loadSession())   ← lazy initializer，从 localStorage 同步读
   → session 字段已 hydrate（accessToken / currentTenantId / user）
   ↓

2. App.tsx → RequireAuth → isAuthenticated = true（accessToken 非空）
   → 渲染 AppShell → <UserListPage> 之类
   ↓

3. UserListPage → adminUsersListUsers(...)
   → axios 拦截器：getToken() 读 localStorage 拿到 token → 写 Authorization 头
   → 请求带 token → msw 解码 → 返回
```

**反例**（CLAUDE.md 禁止）：若用 `useState(emptySession) + useEffect(loadSession)`，首屏会瞬间 `isAuthenticated = false` → RequireAuth 重定向 `/login` → 闪烁 / 死循环。

---

## 5. v0.3.0 关键基建

v0.3.0 是一次"塌缩式重构"——把 v0.2.0 时代复杂的三后端运行时切换机制全部删除，改 env-driven 单 URL。

### 5.1 新增 4 个核心基建文件

| 文件 | 行数级 | 职责 |
|---|---|---|
| `src/api/env.ts` | ~20 | 唯一 `import.meta.env.VITE_*` 适配点；导出 frozen `env` 对象 |
| `src/api/backend-config.ts` | ~25 | 塌缩到 3 getter：`getApiBaseUrl()` / `getApiMode()` |
| `src/components/app/app-shell.tsx` | ~175 | sidebar + 顶栏 + Outlet；nav items `fnId` 透传 |
| `src/components/app/backend-badge.tsx` | ~22 | 无交互 backend 标签（sidebar 底部 footerExtras） |

### 5.2 废止（v0.3.0 删除）

| 删除物 | 原因 | 替代 |
|---|---|---|
| `src/state/backend-context.tsx` | React Context；同步 hydrate 单例；`useBackend()` hook | `backend-config.ts` 3 getter |
| `src/components/app/backend-switcher.tsx` | sidebar 底部 DropdownMenu + 自定义 baseUrl 编辑 | `backend-badge.tsx` 只读标签 |
| `localStorage["saas.backend"]` | 运行时持久化当前后端选择 | `.env*` 文件（部署期生效） |
| `BackendMode = "msw" \| "aspnetcore" \| "springboot" \| "nextjs-self"` 联合类型 | 联合类型枚举 | 单一字符串 `getApiMode()` 显示标签 |
| 模块级单例 backend instance | 跨页面共享 | env getter 无状态 |
| `VITE_ENABLE_MSW` env（ADR-0014 v0.3.20） | Service Worker 模式完全删除 | 无（dev 永远走 msw-http :5100） |

### 5.3 决策路径

```
v0.2.0 (commit 旧)                v0.3.0 (current)
─────────────────────              ─────────────────────────────
BackendProvider + useBackend   →   env.ts + backend-config.ts 3 getter
BackendSwitcher (DropdownMenu) →   BackendBadge (只读 span)
localStorage["saas.backend"]   →   .env.{local,production} 文件
3-mode 运行时切换              →   部署期生效，build 后冻结
vi.mock('axios') mock 链路       →   msw-http :5100 真实 HTTP 服务
```

### 5.4 与父仓迁移指南的对接

详见：

- `docs/saas-identity-platform-v0.2.0-migration.md` —— v0.2.0 时代迁移（自己 orval）；
- 父仓 `docs/conventions/multi-repo-family.md` §4 —— env-driven 单 URL 的细则。

---

## 6. 决策索引

本仓的架构决策散落在父仓 ADR 与仓内迁移指南。**本仓不持有 `docs/adr/`**——所有 ADR 在父仓 `docs/adr/`。

### 6.1 父仓 ADR（与本仓相关）

| ADR | 主题 | 对本仓的影响 |
|---|---|---|
| [ADR-0001](../../../docs/adr/0001-suite-owns-l0-and-l5.md) | suite 保留 L0 / L5 门 | 本仓只能声明 L1-L4（见 `.harness/stack.json`） |
| [ADR-0002](../../../docs/adr/0002-trace-json-as-cross-language-anchor-contract.md) | trace.json 是跨语言锚点 | L4 测试挂 fn-ID 经 `trace_cmd`，禁手写 `.state/trace.json` |
| [ADR-0003](../../../docs/adr/0003-function-tree-requires-human-approval.md) | 功能清单变更需人批 | 改 F / I 必须先 `/tree-change` |
| [ADR-0005](../../../docs/adr/0005-defense-in-depth-for-protected-paths.md) | 受保护路径纵深防御 | `.claude/hooks/` 不让改 + pre_bash_guard 启发式拦截 |
| [ADR-0012](../../../docs/adr/0012-msw-as-http-server.md) | msw 仓升级为独立 HTTP 服务 | dev 走 saas-msw `:5100`（B 强度），SW 模式已删除 |

### 6.2 父仓隐含 ADR（`multi-repo-family.md` §4）

| 编号 | 主题 | 对本仓的影响 |
|---|---|---|
| **ADR-0014** | env-driven 单 URL | 删除 BackendProvider / BackendSwitcher / useBackend / localStorage["saas.backend"]；改 env-driven 3 getter |

### 6.3 本仓迁移 ADR（仓内）

| 迁移 | 文件 | 影响 |
|---|---|---|
| v0.2.0 迁移 | `docs/saas-identity-platform-v0.2.0-migration.md` | 撤销 shared 仓 TS 客户端依赖；改自己 orval codegen；废止 `@saas/shared` alias |

---

## 7. 术语表

| 术语 | 含义 | 详细 |
|---|---|---|
| **orval** | OpenAPI → TS client 的 codegen 工具 | `orval.config.ts` 配置；本仓选 `client: "react-query"` + `mode: "split"` |
| **baseURL** | axios 请求拦截器注入的根 URL | root URL，不含 `/api/v1` 前缀（`path` 自带）；见 `memory/axios-baseurl-no-path-prefix.md` |
| **installHttpClient** | 一次性 axios 拦截器装载 | main.tsx bootstrap 调一次；不调则 prod 永远走同 origin 被 nginx 405；见 `memory/orval-axios-baseurl-must-be-installed.md` |
| **getApiMode()** | 后端显示标签 getter | 默认 `"msw-http"`；仅 UI 展示，不参与路由 |
| **getApiBaseUrl()** | 后端 base URL getter | 默认 `"http://localhost:5100"`（saas-msw）；可被 `.env*` 覆盖 |
| **fnId** | function-tree 里的 M/F/I 编号 | 挂到 UI 的 `data-fn="<fnId>"`；L5 alignment 据此校验已上线 F 必须被引用 |
| **RequireAuth** | `<App.tsx>` 的路由守卫 | 据 `useTenant().isAuthenticated` 决定重定向 `/login` |
| **OAuth 2.0 (saas)** | RFC 6749 IdP 流程（authorize/token） | 三 saas 后端对称实现；grant_type=authorization_code / refresh_token |
| **JWT HS256** | RFC 7519 access token 真签发 | `JwtIssuer.{java,cs,ts}` 对称；`JWT_SIGNING_KEY` ≥32B env 镜像 |
| **DevJwtDecoder** | dev profile bean，吃 MSW `alg=none` test token | prod 删除 + 配 `JWT_ISSUER_URI` 走 JWKS |
| **ssot** | shared 仓承担的 API + DB schema 唯一真源 | 本仓只读 `generated/openapi/openapi.yaml` |
| **stack.json** | 项目自描述（栈 + 门配置） | `.harness/stack.json`；本仓只能声明 L1-L4 |
| **trace.json** | 测试命中 fn-ID 的清单 | `.state/trace.json`；`trace_cmd` 产，禁手写 |
| **fnTest** | 测试 ID 嵌入 it 名称的模式 | `fnTest(["M01.F05.I01"], "desc", () => {...})` |
| **env 三层** | `.env.example` / `.env.local` / `.env.test` / `.env.production` | example + test committed；local + production gitignored；部署平台覆盖 |
| **msw-http** | msw 仓作为独立 HTTP 服务的形态（B 强度） | 区别于旧 msw（Service Worker in-process）；dev 路径只走 msw-http |

---

## 附录 A：与父仓 `docs/ARCHITECTURE.md` 的关系

父仓 `docs/ARCHITECTURE.md` 描述 **14 个子仓 + 父仓** 的全景（家族拓扑 / 跨仓流程 / 端口 / CORS / env）。

本文件（`docs/ARCHITECTURE.md`）**只 zoom in 本仓**——描述 `saas-identity-platform-react/` 自己的：

- 角色与定位（§1）—— 我在家族里是「前端 1/3」；
- 目录骨架（§2）—— 我仓内 `src/{api,components,pages,state,lib}/` 长什么样；
- 核心模块（§3）—— 各文件做什么；
- 核心流程（§4）—— 我自己从启动到 HTTP 请求的内部链路；
- v0.3.0 关键基建（§5）—— 我自己最近的塌缩式重构；
- 决策索引（§6）—— 与本仓相关的 ADR 子集。

**不重复**父仓文档的：

- 跨仓家族拓扑 → 父仓 §2；
- 双 SSOT 概念 → 父仓 §3.1；
- 一份契约三套 codegen → 父仓 §3.2；
- 后端模式 env-driven → 父仓 §3.3（简版）/ `multi-repo-family.md` §4（详版）；
- OAuth 2.0 + JWT（HS256）契约 → 父仓 §3.4；
- 端口 / CORS / env 全景 → 父仓 §6；
- 12 份 ADR 索引 → 父仓 §7；
- 14 子仓矩阵 → 父仓 §9；
- 典型陷阱 → 父仓附录 B + `memory/`。

**Zoom in 边界**：本文件不写跨仓同步的具体步骤（父仓 §5.1）、不写后端实现细节（springboot / aspnetcore / nextjs-self 各仓 CLAUDE.md）。

---

## 附录 B：本仓典型陷阱（详见父仓 `memory/`）

| 陷阱 | 后果 | 解法 |
|---|---|---|
| `main.tsx` 忘调 `installHttpClient(getToken)` | prod 永远走同 origin 被 nginx 405 | main.tsx bootstrap 装拦截器（v0.3.20 起必须） |
| axios baseURL 含 `/api/v1` 前缀 | path 前缀重复 | baseURL 是 root URL；path 自带 prefix |
| `useState(emptySession) + useEffect(loadSession)` | 首屏瞬间 `isAuthenticated=false` → RequireAuth 重定向 `/login` 闪烁 / 死循环 | tenant / selection 必须 lazy initializer 同步 hydrate |
| `vi.mock('axios')` mock API | orval 加载崩，`shared` 模块初始化失败只剩 `getTitle` 一个 export | 走 msw-http :5100 真实 HTTP；或 `vi.mock('@/api/endpoints/endpoints')` 替具名函数 |
| 按钮加 lucide 图标（Plus / Trash2 / Power / ShieldCheck / Save / X / LogIn / Download） | 用户明确要求**纯文字按钮** | 仅保留 Check / ChevronRight / FolderTree / LogOut / Server |
| axios 升 1.19 | orval 7 类型推断挂（`AxiosResponseResult` 不兼容） | pin `axios` < 1.19 |
| demo 密码（`demo123`）写在 UI / 注释 / 测试 | 泄密 | 演示账号由公众号 / 小红书发放；仓内仅 username |
| 改旧 V 文件（V00N_*.sql） | 与 Flyway 一致性冲突 | 加新 V 文件，不改老的 |
| 后端 CORS allowlist 漏配 5173 | 浏览器报 CORS 错 → CF 把 502 换皮丢 CORS 头 → 误诊 | springboot/aspnetcore CORS allowlist 必须含 5173 + 3000 |

---

## 附录 C：相关约定 / 决策 / 文档

- 父仓 CLAUDE.md：项目约定 + 工作循环
- 父仓 `docs/ARCHITECTURE.md`：14 子仓家族架构
- 父仓 `docs/adr/`：12 份架构决策记录
- 父仓 `docs/conventions/multi-repo-family.md`：多仓家族拓扑 + ADR-0014
- 父仓 `docs/conventions/submodule.md`：gitlink / submodule 加减与回滚
- 本仓 `CLAUDE.md`：技术栈 + 禁止事项 + 工作循环
- 本仓 `docs/functions/function-tree.md`：M0x / F0y / I0z 功能清单
- 本仓 `docs/saas-identity-platform-v0.2.0-migration.md`：v0.2.0 迁移指南
- 本仓 `.env.example`：env 三层模板
- 本仓 `.harness/stack.json`：suite 门禁读配置