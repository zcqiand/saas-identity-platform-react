# ===== saas-identity-platform-react — Vite SPA production image =====
# Multi-stage: build with node:20-alpine, serve with nginx:alpine.
# 容器内监听 :80;VPS nginx 反代到 host 8021 (saas-react.xiangru.uk)。

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 硬约束:npm 依赖一律走 npmmirror (suite root CLAUDE.md §2)
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# prebuild hook (gen:shared) 自动跑;需要 ../saas-identity-platform-shared 存在
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]