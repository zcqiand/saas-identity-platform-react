# ===== saas-identity-platform-react — Vite SPA production image =====
# Multi-stage: build with node:20-alpine, serve with nginx:alpine.
# 容器内监听 :80;VPS nginx 反代到 host 8021 (saas-react.xiangru.uk)。

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 硬约束:npm 依赖一律走 npmmirror (suite root CLAUDE.md §2)
RUN npm config set registry https://registry.npmmirror.com

# alpine 默认无 git / ca-certificates,装上以 clone sibling (file: 依赖 + gen:shared)
RUN apk add --no-cache git ca-certificates

# 拉 sibling 仓（file: 依赖 + gen:shared 需要 sibling 存在）
RUN git clone --depth 1 https://github.com/zcqiand/saas-identity-platform-msw.git ../saas-identity-platform-msw \
 && git clone --depth 1 https://github.com/zcqiand/saas-identity-platform-shared.git ../saas-identity-platform-shared

COPY package.json package-lock.json ./
# 用 npm install 不是 npm ci:package.json 引用 file:../saas-identity-platform-msw
# (file path 版本),旧 lockfile 锁了 0.1.0 → npm ci 严格不匹配。
# npm install 按 package.json + sibling 实际版本安装,自动重写 lockfile。
# --legacy-peer-deps 兼容某些宽松 peer 依赖。
RUN npm install --legacy-peer-deps --no-audit --no-fund

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