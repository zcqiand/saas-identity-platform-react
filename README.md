# SaaS 多租户多应用身份平台 · React 前端

SaaS 身份平台的 React 前端 —— Vite + shadcn/ui，env 驱动单 URL（ADR-0014）。

本仓为《React从入门到项目实践》（亚马逊电子书）案例二「SaaS 多租户身份平台」（第 39-42 章）的可运行配套工程，是书稿代码块的 **source of truth**。

## 快速开始

```bash
npm install        # 安装依赖
npm test           # 全量测试（无 Key / 无 Docker / 无网可跑）
npm run dev        # 本地开发（Vite）
npm run build      # 生产构建
```

以上为前端本仓；完整跑通业务链路还需按各章说明启动配套后端与数据库（见第 39 章）。

## 功能特性

- 多租户 / 多应用 / 用户 / 角色 / 菜单 / API Key / 审计事件管理页
- orval 读 shared 仓 OpenAPI 生成 `src/api/endpoints/`（axios 具名函数）
- v0.3.0 后端配置塌缩到 env：`src/api/env.ts` 唯一适配点 + `backend-config.ts` 3 个 getter

## 技术栈

| 技术 | 版本 |
| :--- | :--- |
| React | ^19.0.0 |
| React Router DOM | ^7.0.0 |
| @tanstack/react-query | ^5.62.0 |
| orval（axios client） | ^7.5.0 |
| ajv | ^8.20.0 |
| TypeScript | 5.7 |
| Vite | ^6.0.0 |
| Vitest | ^2.1.0 |
| Tailwind CSS | ^4.3.3 |

> 依赖版本与 `version-lock.json` 的 `version_lock` 一致，不引入 lock 外的库。

## 配套书籍及章节映射

> 同一案例仓后续接入其他书籍时，在此节下新增书籍小节。

### 《React从入门到项目实践》（亚马逊电子书）

- 书稿基线：tag `v0.3.44-20260925`（冻结，正文代码清单以此为准）
- 书稿定位：案例二「SaaS 多租户身份平台」，覆盖第 39-42 章

| 章 | 主题 | 对应源文件 |
| :--- | :--- | :--- |
| 39 | 案例二：SaaS 架构与多租户 | `src/pages/TenantListPage.tsx`、`src/components/tenant-switcher.tsx` |
| 40 | 案例二：登录认证与 RBAC 菜单授权 | `src/pages/LoginPage.tsx`、`src/pages/RoleMenuGrantPage.tsx` |
| 41 | 案例二：用户管理与应用集成 | `src/pages/UserListPage.tsx`、`src/pages/AppListPage.tsx` |
| 42 | 全栈项目总结与部署 | — |

## 快速链接

- [CLAUDE.md](CLAUDE.md) — 开发约定与编码规范
- [系统架构.md](docs/ARCHITECTURE.md) — 结构 / 边界 / 数据流 / 决策
- [功能规格.md](docs/functions/function-tree.md) — 功能名称、描述与验收标准
- [未来开发计划](PLAN.md) — 待办与迭代方向
- [更新日志](CHANGELOG.md) — 版本变更记录
