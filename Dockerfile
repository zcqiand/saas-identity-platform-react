# ===== saas-identity-platform-react — Vite SPA production image =====
# Multi-stage: build with node:24-alpine, serve with nginx:alpine.
# 容器内监听 :80;VPS nginx 反代到 host 8021 (saas-react.xiangru.uk)。
#
# builder base 说明（v0.3.16 起从 node:20-alpine 升到 node:24-alpine）:
#   shared 仓新版 @typespec/compiler 用了 Node 22+ 才有的
#   `import { glob } from 'fs/promises'` named-export 语法,
#   node:20-alpine 跑 emit:openapi 时 `SyntaxError: glob not exported`。
#   升到 node:24-alpine 与 saas-identity-platform-nextjs 的 node:24-slim
#   同主版本（Vite 纯 JS, 无 native deps, alpine 安全）。

# ---------- Stage 1: builder ----------
FROM node:24-alpine AS builder
WORKDIR /app

# 硬约束:npm 依赖一律走 npmmirror (suite root CLAUDE.md §2)
RUN npm config set registry https://registry.npmmirror.com

# alpine 默认无 git / ca-certificates,装上以 clone sibling (gen:shared)
RUN apk add --no-cache git ca-certificates

# 拉 sibling 仓（gen:shared 需要 shared 仓存在；msw 仓 2026-09-17 删除，clone 步骤随之移除）
RUN git clone --depth 1 https://github.com/zcqiand/saas-identity-platform-shared.git ../saas-identity-platform-shared

COPY package.json package-lock.json ./
# npm ci（2026-09-22 msw 剔除收尾）：file:../saas-identity-platform-msw 依赖已剔除、
# lockfile 重生成后无 file: 残留，与 CI 同链路严格安装。
RUN npm ci --no-audit --no-fund

COPY . .
# VITE_* build-time 烘焙(2026-08-28 起 .env.production gitignored,Docker build
# context 里没有它):prod 值在此显式声明,语义与原 .env.production 完全一致。
# 跨仓约定:saas-react→springboot(vue→aspnetcore)。公开 URL 非 secret。
ENV VITE_API_BASE_URL=https://saas-springboot.xiangru.uk
ENV VITE_API_MODE=springboot
# B 方案（ADR-0030 REQ-2026-001）登录页 clientId 门：直接访问 /login 时兜底到
# saas-console 自身应用；值须= oauth_client.client_id（与 .env.example/nextjs 同源）
ENV VITE_LOGIN_CLIENT_ID=saas-console
# prebuild hook (gen:shared) 自动跑;需要 ../saas-identity-platform-shared 存在
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]