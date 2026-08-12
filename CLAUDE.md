# saas-identity-platform-react

> React 19 + Vite + TS 5.6 + shadcn/ui。消费 shared 仓 TypeSpec codegen 产物。

## 1. 这是什么

saas-identity-platform 的 React 前端。MSW 走 shared 产物；API client 走 shared 产物；运行时校验走 shared 产物。

## 2. 禁止事项

- 禁止 zod 手写 schema（已由 shared codegen 替）
- 禁止手写 fetch（统一走 `src/api/`）
- 禁止 class 组件
- 禁止 localStorage 直接散落组件（统一走 `src/store/`）

## 3. 指向别处

- shared 仓：`../saas-identity-platform-shared`
- function-tree：`docs/functions/function-tree.md`

## 4. 工作循环

1. 改 UI（`src/pages/<module>/*.tsx`）
2. `npm run gen:shared`（如改了 shared）
3. `python scripts/gate.py -p saas-identity-platform-react`
