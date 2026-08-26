# SaaS 多租户多应用身份平台 · React 前端

SaaS 身份平台的 React 前端 —— Vite + shadcn/ui，env 驱动单 URL（ADR-0014）。

本仓为《（书稿信息待补）》案例（待补）的可运行配套工程，是书稿代码块的 **source of truth**。

## 快速开始

```bash
npm install        # 安装依赖
npm test           # 全量测试（无 Key / 无 Docker / 无网可跑）
npm run dev        # 本地开发（Vite）
npm run build      # 生产构建
```

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
| MSW | ^2.7.0 |
| zod / ajv | ^3.23.8 / ^8.20.0 |
| TypeScript | 5.7 |
| Vite | ^6.0.0 |
| Vitest | ^2.1.0 |
| Tailwind CSS | ^4.3.3 |

> 依赖版本与 `version-lock.json` 的 `version_lock` 一致，不引入 lock 外的库。

## 配套书籍及章节映射

| 章 | 主题 | 对应源文件 |
| :--- | :--- | :--- |
| （待补） | | |

## 快速链接

- [CLAUDE.md](CLAUDE.md) — 开发约定与编码规范
- [系统架构.md](docs/ARCHITECTURE.md) — 结构 / 边界 / 数据流 / 决策
- [功能规格.md](docs/functions/function-tree.md) — 功能名称、描述与验收标准
- [未来开发计划](PLAN.md) — 待办与迭代方向
- [更新日志](CHANGELOG.md) — 版本变更记录
