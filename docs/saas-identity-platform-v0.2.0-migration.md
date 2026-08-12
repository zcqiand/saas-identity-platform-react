# saas-identity-platform v0.2.0 — 多前端迁移指南

> 2026-08-12 · 给 Vue / Next.js / 后续 session 用的迁移速查手册
>
> 适用范围：saas-identity-platform-{react,vue,nextjs,msw,shared,aspnetcore,springboot}（7 仓）
> 本文档是 v0.1.x → v0.2.0 的所有约束集中点。react 仓已落地；vue / nextjs 按本指南同步即可。

---

## 1. 范围 & 影响面

| #   | 仓                       | 改动量     | 关键文件                                                  | 是否需发版               |
| --- | ------------------------ | ---------- | --------------------------------------------------------- | ------------------------ |
| 1   | **shared**（TypeSpec SSOT） | 中    | `orval.config.ts` / `package.json`（exports）              | 是：v0.1.x → v0.1.5+    |
| 2   | **msw**（mock layer）       | 大    | `src/handlers-extra.ts`（42 路由）+ `src/handlers-array.ts` | 是：v0.1.x → v0.2.0     |
| 3   | **react**（本次实现）        | 全部  | 4 新文件 + 13 改写文件 + 6 page + icon/文案/amber 框      | 是：v0.1.x → v0.2.0     |
| 4   | **vue**                     | 全量镜像 | 跟随 react 改                                             | 跟随                     |
| 5   | **nextjs**                  | 全量镜像 | 跟随 react 改（含 `'use client'` 适配）                    | 跟随                     |
| 6   | **aspnetcore**              | 无    | 后端已实现 `/auth/login` 真实 JWT 签发，前端切非 msw 即可对接 | 无须改                   |
| 7   | **springboot**              | 无    | 同上                                                       | 无须改                   |

**「改动量」等级定义**：小 = < 5 文件、中 = 5-15 文件、大 = > 15 文件或含契约改动。

**消费契约**：所有前端通过 `file:../saas-identity-platform-shared` 共享产物；通过 `file:../saas-identity-platform-msw` 共享 mock。

---

## 2. 关键架构决策（所有前端必须遵守）

> 🚨 **速查卡** —— 新 session 不用通读全文，先看本节就知道哪些约束是 hard rule。
> 任何 vue / nextjs 仓如果违反这 4 条，门禁会立刻挂。

### 2.1 运行时后端切换（不走 `.env`）

后端模式（msw / aspnetcore / springboot）**写到运行时 Context，不写到 `.env`**。让用户在浏览器里随时切换，**不需 rebuild**。

| 层 | 文件 | 职责 |
|---|---|---|
| 模块级单例 | `src/api/backend-config.ts` | `getBackend / setBackend / getBaseUrl / setBaseUrlFor / hydrateBackendConfig / snapshotBackendConfig / BACKEND_DEFAULT_BASE_URLS` |
| 持久化 + hydrate | `src/state/backend-context.tsx`（React）/ `state/backend-context.ts`（Pinia） | localStorage `saas.backend` ↔ 模块单例双向同步 |
| HTTP 注入 | `src/api/http-client.ts` | `installHttpClient(getToken)` 装 axios 拦截器 |
| UI | `src/components/app/backend-switcher.tsx` | sidebar 底部、低视觉权重的 dropdown；含自定义 baseUrl 编辑 |
| 启动分流 | `src/mocks/browser.ts` | `getBackend() !== "msw"` 时**跳过** `setupBrowserMocks()` |

```ts
// src/api/backend-config.ts — 模块级单例骨架（vue / nextjs 复制即可）
export type BackendMode = "msw" | "aspnetcore" | "springboot";

const DEFAULT_BASE_URLS = {
  msw: "",                          // 同源，service worker 拦截
  aspnetcore: "http://localhost:5000",
  springboot: "http://localhost:8080",
};

let currentBackend: BackendMode = "msw";
let baseUrls = { ...DEFAULT_BASE_URLS };

export const getBackend = () => currentBackend;
export const setBackend = (m: BackendMode) => { currentBackend = m; };
export const getBaseUrl = () => baseUrls[currentBackend];
export const setBaseUrlFor = (m: BackendMode, url: string) => { baseUrls[m] = url; };
export const hydrateBackendConfig = (p: { backend?: BackendMode; baseUrls?: Partial<Record<BackendMode, string>> }) => {
  if (p.backend) currentBackend = p.backend;
  if (p.baseUrls) baseUrls = { ...baseUrls, ...p.baseUrls };
};
export const snapshotBackendConfig = () => ({ backend: currentBackend, baseUrls: { ...baseUrls } });
export const BACKEND_DEFAULT_BASE_URLS = DEFAULT_BASE_URLS;
```

**Vue 等价物**：Pinia store 做同样的事；UI 放 sidebar 底部；axios 拦截器在 `main.ts` 注册。
**Next.js 等价物**：`useState` + Context；交互组件必须 `'use client'`。

### 2.2 1:1 端点映射（orval 具名函数）

后端契约在 shared 仓（`@saas/identity-platform-shared/api-client`）：

- 每个端点 → 一个**具名函数**：`adminTenantsListTenants()` / `tenantUsersCreateUser(...)` / `authLogin(...)` / ...
- 类型从 `endpoints.schemas.ts` 导入：`CreateTenantRequest` / `Tenant` / `UpdateUserRequest` ...
- **不要**自己写 fetch + URL 字符串。一律走具名函数。

```tsx
// ✅ 正确
const list = useQuery({
  queryKey: ["adminTenantsListTenants"],
  queryFn: async () => (await adminTenantsListTenants()).data.items,
});

// ❌ 错误（手写 URL 字符串）
const res = await fetch("/api/v1/admin/tenants");
```

**Vue 适配**：把 react-query 换成 `@tanstack/vue-query`，具名函数直接复用；`useQuery` 写法一致。
**Next.js 适配**：app router 下 `'use client'` 包裹的组件内使用；pages router 直接可用。

### 2.3 路由守卫 + lazy initializer

- 未登录（accessToken 空）一律 `<Navigate to="/login" replace />`（React）/ `router.push('/login')`（Vue）/ `redirect('/login')`（Next）
- 三个 Context Provider（**tenant / selection / backend**）**必须用 lazy initializer 从 localStorage 同步 hydrate** —— 否则刷新页面会被守卫误判未登录并踢回登录页

```tsx
// ✅ 正确
const [session, setSession] = useState(() => loadSession());

// ❌ 错误（刷新跳登录 —— 真实踩过坑）
const [session, setSession] = useState(emptySession);
useEffect(() => { setSession(loadSession()); }, []);
```

**测试也要 hydrate**：`tests/setup.ts` 的 `afterEach` 必须 `localStorage.clear()`，否则 vitest 单测间状态泄漏。

### 2.4 CSS 变量必须包成完整 `hsl(...)`

shadcn/Tailwind v4 的 CSS 变量（`--background` / `--foreground` / `--border` 等）必须是**完整颜色值**：

```css
:root {
  --background: hsl(0 0% 100%);       /* ✅ 不能写 --background: 0 0% 100% */
  --foreground: hsl(222.2 84% 4.9%);
  --popover: hsl(0 0% 100%);          /* ✅ DropdownMenu 透明问题专用 */
  --popover-foreground: hsl(222.2 84% 4.9%);
  --border: hsl(214.3 31.8% 91.4%);
  /* ... */
}

@theme inline {
  --color-background: var(--background);   /* 桥接到 Tailwind v4 工具类 */
  --color-foreground: var(--foreground);
  --color-popover: var(--popover);         /* 必须也桥，否则浮层透明 */
  --color-popover-foreground: var(--popover-foreground);
  /* ... */
}
```

**坑**：shadcn 浮层（DropdownMenu / Popover / Select）在 Tailwind v4 dev 模式下偶尔透明 —— **显式 `bg-white`** 兜底 + `@theme inline` 桥 `--popover` 解决。

---

## 3. shared 仓改动（瘦身：只产 OpenAPI.yaml）

> 🚨 **v0.2.0 架构变更**（breaking）：shared 仓从「产 4 种语言客户端」瘦身成「只产 OpenAPI 3.1 yaml」。语言专属客户端（TS / Java / C# / Kotlin / Swift）由各消费方仓**自己 generate**。
>
> 触发原因：见 §3.5「为什么 TS/Java/CS 不再放 shared」。

### 3.1 瘦身清单（已删）

| 路径 | 状态 | 备注 |
|---|---|---|
| `generated/ts/api-client/` | ❌ 删除 | 3751 行 orval 生成的 TS 客户端 |
| `generated/ts/zod-schemas.ts` | ❌ 删除 | zod 校验模板（没人用） |
| `generated/java/` | ❌ 删除 | 60+ DTO + 13 Controller |
| `generated/csharp/` | ❌ 删除 | .sln + .csproj + 12 Controllers + 60+ Models |
| `scripts/codegen/emit-ts-client.ts` | ❌ 删除 | |
| `scripts/codegen/emit-java.ts` | ❌ 删除 | |
| `scripts/codegen/emit-dotnet.ts` | ❌ 删除 | |
| `orval.config.ts` | ❌ 删除 | |
| `tests/snapshots/{ts-client,java-emit,dotnet-emit}.test.ts` | ❌ 删除 | 断言的产物不存在了 |
| `generated/openapi/openapi.yaml` | ✅ 保留 | **唯一产物** |

### 3.2 `package.json` 现状

```json
{
  "exports": {
    ".": "./tsp/main.tsp",
    "./openapi": "./generated/openapi/openapi.yaml"
  },
  "scripts": {
    "build": "npm run emit:openapi",
    "emit:openapi": "tsx scripts/codegen/emit-openapi.ts"
  },
  "devDependencies": {
    "@typespec/compiler": "^1.0.0",
    "@typespec/http": "^1.15.0",
    "@typespec/openapi3": "^1.0.0",
    "@openapitools/openapi-generator-cli": "^2.13.4",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- ❌ **不再有 `axios` / `@tanstack/react-query` / `orval` / `zod`** —— 本仓不再生成 TS 客户端
- ❌ **不再有 `peerDependencies`** —— 没有语言专属包需要声明
- ✅ **`exports` 只暴露 `./tsp/main.tsp`（入口给 tsp compile）+ `./openapi`（消费方读 yaml）**

### 3.3 `CLAUDE.md`「禁止事项」新增第 3 条

```markdown
- 禁止生成语言专属产物（TS/Java/CS/Kotlin/Swift/Dart 客户端代码一律下放给消费方自己 generate）
- 禁止 npm package 的 `exports` 暴露语言路径（如 `./api-client`）；只暴露 `./openapi` yaml 路径
```

### 3.4 重新生成 OpenAPI.yaml

```bash
cd saas-identity-platform-shared
npm install --legacy-peer-deps
npm run build   # 只跑 emit:openapi（tsp compile . → generated/openapi/openapi.yaml）
```

### 3.5 为什么 TS/Java/CS 不再放 shared（架构原因）

**问题**：shared 仓之前用 orval + openapi-generator 产 TS / Java / C# 三种语言客户端。这些产物**物理上住在 shared 仓**，导致：

1. **shared 仓「看着像有 HttpClient 业务」**——3751 行 orval 生成的 TS 代码内含 `axios.get('/api/v1/admin/tenants')` 调用，**形式上**是 HTTP 客户端，污染契约仓形象。
2. **不对称**——springboot / aspnetcore 仓理论上可以自己 generate（`openapi-generator-maven-plugin` / `NSwag`），但**TS 前端**却在从 shared import。
3. **物理阻断新客户端**——Kotlin / Swift / Flutter 等未来客户端天然应该自己 generate，却被 shared 的 TS 产物物理占用 `exports."./api-client"` 等路径。

**方案（采用）**：对称架构 —— shared 只产 OpenAPI.yaml；每个消费方仓自己 generate 自己的客户端。

| 仓 | generate 方式 |
|---|---|
| **react** | 本仓 `orval.config.ts` 读 shared `generated/openapi/openapi.yaml` → `src/api/endpoints/{endpoints,endpoints.schemas}.ts` |
| **vue / nextjs** | 迁移 vue/nextjs 时按 react 同模式 |
| **springboot** | `scripts/gen-shared.sh` 直接调 openapi-generator-cli（不再 cp shared/generated/java/） |
| **aspnetcore** | 未来补 NSwag.csproj 集成读 openapi.yaml |
| **msw** | 本来就自己 orval（不依赖 shared 仓的 TS 产物），零改动 |
| **kotlin-android (P1)** | 未来加仓，Gradle 用 openapi-generator-gradle-plugin 读 openapi.yaml |
| **swift-ios (P2)** | 未来加仓，Xcode 用 Swift Package Manager + openapi-generator-cli |

**优点**：
- ✅ 真源仍唯一：tsp 改了 → emit:openapi → 所有仓自己 generate
- ✅ 对称：每个消费方仓负责自己的客户端语言细节
- ✅ 零重复配置：每仓一份 orval.config.ts（或对应工具的配置），但**配置位置靠近消费方**，改起来本地化
- ✅ shared 仓物理上只剩契约：4500+ 行语言产物 → 0 行

**代价**（可接受）：
- ⚠️ 每个前端/后端仓多 30 秒 generate 时间（CI 总开销微涨）
- ⚠️ 多份 orval / openapi-generator 配置分散；改 schema 时要确认所有仓都跑了 generate
- ⚠️ 第一次仓初始化要记得跑 `npm run gen:shared`

---

## 4. msw 仓改动

`src/handlers-extra.ts` 追加 42 个 handler 路由（前缀 `http.get/post/patch/put/delete`，URL 用 `BASE = "http://localhost:5173/api/v1"`）。

### 4.1 6 域 handler 补全表

| 域 | endpoints | method × 数 |
|---|---|---|
| **M00 Tenants** | `/admin/tenants` (GET/POST) · `/admin/tenants/:id` (GET/PATCH/DELETE) | 5 |
| **M01 Users** | `/tenants/:tenantId/users` (GET/POST) · `/tenants/:tenantId/users/:userId` (GET/PATCH/DELETE) · `/tenants/:tenantId/users/:userId/roles` (PUT) · `/tenants/:tenantId/users/:userId/status` (PATCH) | 8 |
| **M02 Roles** | `/tenants/:tenantId/roles` (GET/POST) · `/tenants/:tenantId/roles/:roleId` (GET/PATCH/DELETE) · `/tenants/:tenantId/roles/:roleId/menus` (GET/PUT/DELETE) | 9 |
| **M03 Auth** | `/auth/login` (POST) · `/auth/logout` (POST) · `/me` (GET) | 3 |
| **M05 API Keys** | `/tenants/:tenantId/api-keys` (GET/POST) · `/tenants/:tenantId/api-keys/:keyId/revoke` (POST) · `/tenants/:tenantId/api-keys/:keyId/rotate` (POST) | 4 |
| **M06 Audit** | `/tenants/:tenantId/audit-events` (GET) | 1 |
| **M08 Apps + Menus** | `/admin/apps` (GET/POST) · `/admin/apps/:appId` (GET/PATCH/DELETE/status) · `/admin/apps/:appId/menus` (GET/POST/:menuId GET-PATCH-DELETE-/reorder-/parent) · `/me/menus` (GET) | 12 |
| **合计** | | **42** |

### 4.2 `auth/login` 逻辑要点

```ts
http.post(`${BASE}/auth/login`, async ({ request }) => {
  const body = (await request.json()) as { username?: string; password?: string };
  // 1. 空字段 → 400 BAD_REQUEST
  // 2. 密码不等于 DEMO_PASSWORD → 401 INVALID_CREDENTIALS
  // 3. username 不在 users fixture → 401 INVALID_CREDENTIALS
  // 4. 全部通过 → 200 { accessToken: `mock-jwt-${user.id}`, refreshToken, tokenType: "Bearer", expiresIn: 3600, userId, currentTenantId }
  //    同时往 auditEvents push login_success
});
```

**密码不公开**：`DEMO_PASSWORD` 仅在 msw 仓内部常量（用于本地 dev）；UI / 注释 / 测试断言**都不出现**。
**accessToken 格式**：`mock-jwt-${user.id}` —— `/me` handler 用 `Authorization: Bearer mock-jwt-${id}` 反查 user。

### 4.3 写操作 mutate

GET 看不到变化会立刻让单测挂。写操作必须 mutate 对应数组：

```ts
tenants.push({ id: `00000000-0000-0000-0000-${ts.slice(-8)}${rand}`, ...body });
// 或
users.splice(users.findIndex(u => u.id === userId), 1);
```

创建时 id 用 `00000000-0000-0000-0000-${ts.slice(-8)}${rand}`（UUID-like 但固定前缀方便按前缀搜索）。

### 4.4 Vue / Next.js 等价物

直接消费同一份 `@saas/identity-platform-msw`（devDep）；handler 不需重写 —— msw 跨 worker / node 两端运行。

---

## 5. react 仓改动清单

### 5.1 4 个新文件（核心基建）

| 文件 | 行数 | 关键设计 |
|---|---|---|
| `src/api/backend-config.ts` | 53 | 模块级单例；7 个 getter/setter；hydrate/snapshot 双向桥 |
| `src/state/backend-context.tsx` | 130 | React Context；同步 hydrate 单例；`useBackend()` hook |
| `src/components/app/backend-switcher.tsx` | 142 | DropdownMenu + 自定义 baseUrl 编辑；`<Server>` 装饰图标 |
| `src/components/app/crud-dialog.tsx` | 184 | 通用 CRUD Dialog；`fields: FieldDef[]` 驱动；支持 text/textarea/select/checkbox |

**附带新增**（非核心但同 PR 落）：`src/state/selection-context.tsx`（73 行）+ `src/pages/{AppListPage,MenuTreePage,RoleMenuGrantPage}.tsx` —— 这些是功能扩展，不是基建。

### 5.2 13 个改写文件（按行说明关键改动）

| # | 文件 | 关键改动 |
|---|---|---|
| 1 | `src/api/http-client.ts` | L39-48 `installHttpClient(getToken)` 装 axios 拦截器；L11 引 `getBaseUrl` 从单例；保留 L57-80 `apiRequest` 兼容老调用方 |
| 2 | `src/state/tenant-context.tsx` | L104 **lazy initializer** `useState(() => loadSession())`；L129-142 `logout` 调 `/auth/logout`（best-effort） |
| 3 | `src/state/selection-context.tsx` | **新文件**（同 5.1 范围）；L60-71 双 `useState` lazy init；默认值 = acme / app-lab |
| 4 | `src/App.tsx` | L16-20 加 `<RequireAuth>` 守卫（读 `isAuthenticated`）；L29-44 路由表加 8 个新路径 |
| 5 | `src/components/app/app-shell.tsx` | L97-100 `onLogout = async () => { await logout(); navigate("/login") }`；L116 `footerExtras={<BackendSwitcher />}`；L120 `<Toaster />` 浮层 |
| 6 | `src/components/app/sidebar-nav.tsx` | L23-24 `footerExtras?: ReactNode` slot；L31-32 title "SaaS 多租户身份平台" / subtitle "Identity Platform" |
| 7 | `src/index.css` | L5-24 CSS 变量包成 `hsl(...)`（含 `--popover`）；L30-50 `@theme inline` 桥接所有变量到 Tailwind v4 |
| 8 | `src/mocks/browser.ts` | L10 `if (getBackend() !== "msw") return` —— 切非 msw 模式跳过 worker 启动 |
| 9 | `src/main.tsx` | L22-30 Provider 嵌套顺序：`<BackendProvider><TenantProvider><SelectionProvider><BrowserRouter><App>` |
| 10 | `package.json` | L20 加 `"axios": "^1.7.7"`；L25 `"zod": "^3.23.8"`（runtime 校验兜底） |
| 11 | `vitest.config.ts` | L18 `optimizeDeps.include` 加 `@saas/identity-platform-shared/api-client{,/schemas}` + `@saas/identity-platform-msw`；L28-30 `server.deps.inline` 强制 vite 内联处理 |
| 12 | `tests/setup.ts` | L23-100 `vi.mock("@saas/identity-platform-shared/api-client")` 返回 fixture 数据；L102-105 `afterEach cleanup() + localStorage.clear()` |
| 13 | `tests/state-helpers.tsx` | 加 `BackendProvider` / `useBackend` re-export；包装三层 Provider |

**附加改动**（合 1 行）：6 个 pages（`TenantListPage` / `UserListPage` / `RoleListPage` / `ApiKeyListPage` / `AuditListPage` + 新 3 个 `AppListPage` / `MenuTreePage` / `RoleMenuGrantPage`）**全部**用 `useQuery` + `useMutation` 替换硬编码数组；按钮接 `CrudDialog` / `ConfirmDialog`。

### 5.3 删除的图标（避免回归）

`Plus` / `Trash2` / `Power` / `ShieldCheck` / `Save` / `X` / `LogIn` / `Download` —— 按钮里**只留文字**。

保留的装饰图标：
- `Check`（Tenant 行对勾）
- `ChevronRight`（菜单树缩进）
- `FolderTree`（菜单标题）
- `LogOut`（sidebar 登出）
- `Server`（后端切换器）

**验证方法**：`grep -rE "Plus|Trash2|Power|ShieldCheck|LogIn|Download" src/pages/` 必须返回 0 行。

### 5.4 下拉框中英对照表（复制粘贴即可）

| 域 | value | 显示 |
|---|---|---|
| Tenant.status | `active` / `suspended` / `archived` | 启用 / 暂停 / 归档 |
| User.status | `active` / `invited` / `suspended` / `disabled` | 启用 / 已邀请 / 暂停 / 停用 |
| App.status | `active` / `disabled` | 启用 / 停用 |
| Menu.status | `active` / `disabled` | 启用 / 停用 |
| Menu.type | `group` / `page` / `action` | 分组（容器）/ 页面（叶子）/ 操作（按钮） |
| Audit.action | `user_created` / `user_updated` / `user_deleted` / `login_success` / `login_failed` / `oauth_token_issued` / `api_key_created` / `api_key_revoked` / `role_assigned` / `role_revoked` | 创建用户 / 更新用户 / 删除用户 / 登录成功 / 登录失败 / 签发令牌 / 创建 API Key / 吊销 API Key / 分配角色 / 撤销角色 |
| Role.permissionIds | `users.read` 等 | **保留原文**（技术标识符） |

**约束**：`value` 仍是英文契约（API 透传），**只改 label**。

### 5.5 登录页 demo 账号处理（amber 提示框文案模板）

**不公开密码**。改用 amber 提示框引导关注公众号 / 小红书：

```tsx
<div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs space-y-2">
  <p className="font-medium text-amber-900">🔐 演示账号密码不公开</p>
  <p className="text-amber-800 leading-relaxed">
    如需体验，请通过下方任一方式获取最新演示密码：
  </p>
  <ul className="space-y-1 text-amber-800">
    <li className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold shrink-0">微</span>
      <span>关注微信公众号 <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">SaaS 实战派</code>，回复「演示」</span>
    </li>
    <li className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold shrink-0">书</span>
      <span>关注小红书 <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">@SaaS 实战派</code>，查看置顶笔记</span>
    </li>
  </ul>
</div>
```

**约束**：
- 如果公众号 / 小红书账号实际不存在，**占位文本可保留**（后续接真账号替换）
- demo 密码（`demo123` / `DEMO_PASSWORD` 等）**不能出现在任何 UI、注释、测试断言**
- 公开的「用户名清单」可保留（`alice / bob / dave / eve`），但**只列用户名 + 租户，不列密码**

### 5.6 测试覆盖

- `tests/setup.ts` —— `vi.mock("@saas/identity-platform-shared/api-client")` 返回 fixture 数据；每个测试文件不要再各自 mock（避免重复实现导致测试间不一致）
- `tests/integration/require-auth.test.tsx` —— 验证未登录访问 `/tenants` → 重定向 `/login`
- 5 个新集成测试：`app-list` / `menu-tree` / `role-menu-grant` / `require-auth` / `sidebar-active`
- 32 个测试全绿
- L5 软告警 0 条

---

## 6. 迁移 Vue 仓的 11 步

> 🚨 **架构基线**：vue 仓**自己 generate** 自己的 TS 客户端（与 react 仓对称），不再 `file:` 依赖 `@saas/identity-platform-shared`。
>
> 共享仓只产 OpenAPI.yaml；vue 仓的 `orval.config.ts` 读 shared 的 yaml → 写到 vue 仓自己的 `src/api/endpoints/`。

```bash
cd saas-identity-platform-vue
npm install --legacy-peer-deps
```

| 步 | 操作 |
|---|---|
| 1 | **本仓接管 TS codegen**：新增 `orval.config.ts`（input 指向 `../saas-identity-platform-shared/generated/openapi/openapi.yaml`，output target `./src/api/endpoints/endpoints.ts`，`client: "vue-query"`）；新增 `scripts/gen-shared.ts`（同 react：先 `cd ../shared && npm run emit:openapi`，再 `npx orval`）；`package.json` 加 `orval: ^7.5.0` 到 devDeps；`dependencies` 移除 `@saas/identity-platform-shared`；加 `"prebuild": "npm run gen:shared"` |
| 2 | `package.json` 加 `axios@^1.7.7`、`@tanstack/vue-query`、`pinia` |
| 3 | `src/state/*.ts` 改 lazy initializer（`computed(() => loadSession())` + watch 同步写） |
| 4 | `src/api/http-client.ts` 加 `installHttpClient(getToken)` 装 axios 拦截器 |
| 5 | 新增 `src/state/backend-context.ts`（Pinia store）+ `src/components/BackendSwitcher.vue`（放 sidebar 底部） |
| 6 | 复制 `src/api/backend-config.ts`（模块级单例，跨 vue/nextjs 共享即可） |
| 7 | 加路由守卫 `<RequireAuth>`（`router.beforeEach((to) => isAuthenticated.value ? true : '/login')`） |
| 8 | 复制 `src/components/app/crud-dialog.vue`（基于 vue Dialog，fields: FieldDef[] 驱动） |
| 9 | 重写 7 个 `ListPage.vue`：用 `useQuery` + `useMutation` 替换硬编码数组；import 路径 `@/api/endpoints/endpoints` 而不是 `@saas/identity-platform-shared/api-client` |
| 10 | 删按钮图标（参考 §5.3），改下拉框中文（参考 §5.4）；`LoginPage.vue` 加公众号引导框（参考 §5.5），去掉 demo 密码展示 |
| 11 | 跑 gate：`python scripts/gate.py -p saas-identity-platform-vue` |

**Vue 特有坑**：
- orval 客户端：`vue` 仓用 `client: "vue-query"`（不是 `react-query`），产出 `useQuery` 等 vue-query hooks + 具名函数
- Pinia store 默认 SSR-friendly，但**localStorage hydrate 要在 `setup()` 同步读**，不要放 `onMounted`
- `useQuery` 用 `@tanstack/vue-query`（不是 react-query），签名差异：`enabled` / `queryKey` 一致，`queryFn` 返回 `data.value`
- `@saas/identity-platform-msw` 的浏览器 worker 走 `setupWorker`（msw v2），在 `main.ts` 启动
- **shared 仓瘦身后**：vue 仓的 vite alias `"@saas/shared"`（指向 `../saas-identity-platform-shared/generated/ts`）必须删除，否则 vite 解析会失败

---

## 7. 迁移 Next.js 仓的差异点

> 🚨 **架构基线**：nextjs 仓**自己 generate** 自己的 TS 客户端（与 react/vue 对称），不再 `file:` 依赖 `@saas/identity-platform-shared`。
>
> 共享仓只产 OpenAPI.yaml；nextjs 仓的 `orval.config.ts` 读 shared 的 yaml → 写到 nextjs 仓自己的 `src/api/endpoints/`（或 `app/api/endpoints/`，看 router 结构）。

跟 Vue 大体同构（共享同样 11 步的前 1-9 步），但：

| 项 | Next.js 适配 |
|---|---|
| **Codegen 位置** | orval 产物写 `src/api/endpoints/`（**不在** `app/` 里，因为 app router 下 `app/` 是路由目录，不放非路由模块）；tsconfig paths 加 `"@/api/endpoints/*": ["./src/api/endpoints/*"]` |
| **Codegen 触发** | `package.json` 加 `"prebuild": "npm run gen:shared"`；`gen:shared` 脚本读 shared 的 openapi.yaml 跑 orval |
| **Context** | 用 `useState` + localStorage hook（不需要 React Context 但可以保留）；服务端渲染时 `typeof window === 'undefined'` 必须兜底 |
| **后端切换组件** | 放 sidebar 底部；组件顶部加 `'use client'` |
| **交互组件** | app router 下所有 `useState` / `useEffect` / `useMutation` 的组件**必须 `'use client'`** |
| **路由守卫** | app router：`middleware.ts` 检查 cookie / `redirect('/login')`；pages router：`getServerSideProps` 或 `useEffect` |
| **测试** | vitest + `@testing-library/react` + jsdom；hydration 测试用 `await waitFor()` 防止首屏渲染差异 |
| **MSW worker** | `app/api/[...msw]/route.ts` 不可用 —— worker 仍走浏览器内（`public/mockServiceWorker.js`） |
| **Tenant hydration** | 用 `'use client'` 包 `<TenantProvider>`，避免 SSR 时 window undefined 报错；用 `dynamic(() => import(...), { ssr: false })` 包整页也行 |

**关键**：
- `getServerSideProps` / `useEffect` 都要确保 tenant context 在 hydration 后**不会闪**（首屏直接显示默认 tenant，而不是空 → 加载 → 默认）
- **shared 仓瘦身后**：nextjs 仓的 webpack alias `"@saas/shared"`（指向 `../saas-identity-platform-shared/generated/ts`）必须删除，否则 next/webpack 解析会失败

---

## 8. 迁移前后端（aspnetcore / springboot）

**前端切到非 msw 模式即可对接，无需改后端**。

后端需要做的（**已在原 .NET / Java 实现中**）：

- ✅ 实现 `POST /api/v1/auth/login` 真实 JWT 签发（不是 mock-jwt）
- ✅ 实现 `POST /api/v1/auth/logout` token 失效
- ✅ 实现 `GET /api/v1/me` 返回 currentUser
- ✅ 其它 M00 / M01 / M02 / M05 / M06 / M08 写 endpoint 已经在原 .NET / Java 实现里

**前端切换方法**：打开 sidebar 底部「后端切换器」→ 选 ASP.NET Core 或 Spring Boot → 改 baseUrl（如 `http://localhost:5000`）→ 保存。刷新页面后所有 fetch 直走后端真实地址。

**验证**：
```bash
# 启动后端（任一）
cd saas-identity-platform-aspnetcore && dotnet run    # 默认 :5000
cd saas-identity-platform-springboot && mvn spring-boot:run  # 默认 :8080

# 前端 dev 模式
cd saas-identity-platform-react && npm run dev
# 浏览器切后端模式 → 输入 baseUrl → 测试 /auth/login 走真后端
```

---

## 9. 反模式（7 条 ❌ 不要做）

> 🚨 新 session 务必先扫一遍本节，避免重蹈覆辙。

- ❌ **不要**把后端模式写到 `.env` / `.env.example` / `vite.config.ts` proxy / `next.config.js` —— 切模式必须 runtime 可改，不需 rebuild
- ❌ **不要**给按钮加回图标（`Plus` / `Trash2` / `Save` / `LogIn` / 等）—— 用户明确要求**纯文字按钮**
- ❌ **不要**用 `useState(emptySession) + useEffect(loadSession)` —— 刷新跳登录（§2.3 速查卡有例）
- ❌ **不要**手写 fetch + 字符串 URL —— 一律走 `adminTenantsCreateTenant(body)` 等具名函数（§2.2 速查卡有例）
- ❌ **不要** `vi.mock('axios')` 来 mock API —— orval 加载时会崩，`shared` 模块初始化失败只剩 `getTitle` 一个 export
- ❌ **不要** axios 升 1.19 —— orval 7 类型推断会挂（`AxiosResponseResult` 不兼容）
- ❌ **不要**在 shared 仓把 `@tanstack/react-query` 列在 `dependencies` —— 改放 `devDependencies`（让消费方自己装框架对应的包）

---

## 10. Gate 验证清单

```bash
# react 仓（已落地）
python scripts/gate.py -p saas-identity-platform-react
# 期望：L0-L5 全绿，86 功能条目，0 软告警

# msw 仓
python scripts/gate.py -p saas-identity-platform-msw
# 期望：L0-L1-L3-L4-L5 全绿，5 功能条目，0 软告警

# shared 仓
python scripts/gate.py -p saas-identity-platform-shared
# 期望：L0-L1-L3-L4-L5 全绿，29 功能条目，0 软告警

# vue 仓（迁移后）
python scripts/gate.py -p saas-identity-platform-vue
# 期望：L0-L5 全绿，对齐 react 的 86 功能条目，0 软告警

# nextjs 仓（迁移后）
python scripts/gate.py -p saas-identity-platform-nextjs
# 期望：L0-L5 全绿，对齐 react 的 86 功能条目，0 软告警
```

**三档功能条目数对照表**：

| 仓 | 条目数 | 等级 |
|---|---|---|
| `saas-identity-platform-react` | **86** | 主仓 |
| `saas-identity-platform-msw` | **5** | mock layer |
| `saas-identity-platform-shared` | **29** | 契约 SSOT |
| **合计** | **120** | （跨仓共享契约） |

**如果迁移后还有 L5 软告警**，参考 `docs/conventions/`，确保每个 `<button>` 都有 `data-fn="M0x.F0y.I0y"` 锚点（`fnReporter` 在 vitest 跑测试时会扫源码静态检查）。

---

## 附：给新 session 的实用设计

1. **速查卡先行**：第一次进新 session，**先读 §2**（4 条 hard rule），再读 §9（7 条反模式）—— 这 11 条是所有约束的精华。
2. **复制优于重写**：§5.1 的 4 个核心文件 + §5.5 的 amber 模板代码，**直接复制**到 vue / nextjs 仓，不要重写。
3. **中英对照表即用即查**：§5.4 的下拉框 label 表（6 行）—— 复制粘贴即可，不用从 react 仓 grep。
4. **测试先行**：迁移 vue/nextjs 前先跑 react 仓 gate 确认基线绿（86 / 0），迁移完再跑对比；不要在迁移中同时改 react + vue。
5. **axe 校验**：UI 完成后跑 `axe` 检查无障碍；amber 框颜色对比度 ≥ 4.5（amber-50 + amber-200 在 #000 上满足）。
6. **不要 hand-craft msw handler**：直接复用 `@saas/identity-platform-msw`；只有 API 真改了才需要 `npm run gen:handlers` 同步。
7. **后端切换器调测**：开发时随时切 msw / aspnetcore / springboot 三个模式，确认 UI 在三种后端都能跑通（特别留意 401 跳转 / 错误 toast）。