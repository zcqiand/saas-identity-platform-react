#!/bin/sh
# setup-vps.sh — VPS 一次性 bootstrap (Ubuntu/Debian) — saas-identity-platform-react
#
# 用法:
#   sudo sh deploy/setup-vps.sh saas-react.example.com
#
# 同一台 VPS 上要先跑 saas-identity-platform-nextjs 的 setup-vps.sh（如果同时托管
# 两个服务), 本脚本只负责 react 部分: 目录, deploy 用户, 不同 default_server。
#
# React 是静态 SPA, 不需要 saas.env / 数据库 / OAuth issuer, 所以 setup 比 nextjs 简单:
#   1. apt 装 nginx、docker (如未装, 幂等)
#   2. 创建 deploy 用户 (key-only SSH) + 加进 docker 组
#   3. 建 /home/deploy/saas-identity-platform-react/
#   4. 渲染 deploy/nginx-vps.conf.example → /etc/nginx/sites-available/$DOMAIN
#   5. 启用 sites-enabled symlink; 删 Ubuntu 默认页避免 default_server 冲突
#   6. nginx -t && reload
#
# 你**还要做**的（不在脚本里）:
#   a) 把 .crt / .key 放到 /etc/nginx/ssl/your-cert.{crt,key}（复用 saas-nextjs 的 cert 则跳过）
#   b) 本地跑: ssh-copy-id -i ~/.ssh/id_ed25519_gh-deploy.pub deploy@VPS（saas-nextjs 已做则跳过）
#   c) saas-react repo 的 GitHub Repository Secrets 加:
#        DOCKER_USERNAME / DOCKER_PASSWORD / VPS_HOST / VPS_USER / VPS_SSH_KEY
#      （react 不需要 DATABASE_URL_PROD —— 静态 SPA, 后端由 VITE_API_BASE_URL build 时指定）

set -eu

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <saas-react.example.com>" >&2
  exit 1
fi

BASE="/home/deploy/saas-identity-platform-react"

log() { printf '→ %s\n' "$*"; }

# ── 1. 系统包 ─────────────────────────────────────
if ! command -v nginx >/dev/null 2>&1; then
  log "install nginx"
  apt-get update
  apt-get install -y nginx
fi
if ! command -v docker >/dev/null 2>&1; then
  log "install docker.io"
  apt-get install -y docker.io
fi

# ── 2. deploy 用户（无密码、SSH key only）─────────
if ! id deploy >/dev/null 2>&1; then
  log "create deploy user"
  adduser --disabled-password --gecos "" --shell /bin/bash deploy
fi
log "ensure deploy in docker group"
usermod -aG docker deploy

# ── 3. 部署目录 ───────────────────────────────────
# react 是静态 SPA, 容器内无 /data 卷（无 DB、无用户文件）。只建工作目录。
log "create $BASE"
sudo -u deploy mkdir -p "$BASE"

# cert 目录占位
mkdir -p /etc/nginx/ssl
chmod 700 /etc/nginx/ssl

# ── 4. 渲染 nginx vhost template ──────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/nginx-vps.conf.example"
if [ ! -f "$TEMPLATE" ]; then
  echo "Missing template: $TEMPLATE" >&2
  echo "Either run this from the deploy/ directory or git checkout first." >&2
  exit 2
fi

# CERT_BASENAME: cert 文件 basename（不含扩展名），默认 your-cert。
# 用环境变量或第 2 个位置参数覆盖。cert/key 必须在 /etc/nginx/ssl/${CERT_BASENAME}.{crt,key}。
CERT_BASENAME="${CERT_BASENAME:-${2:-your-cert}}"
log "render → /etc/nginx/sites-available/${DOMAIN} (cert=${CERT_BASENAME})"
TARGET="/etc/nginx/sites-available/${DOMAIN}"
sed \
  -e "s/saas.YOUR_DOMAIN/${DOMAIN}/g" \
  -e "s|/etc/nginx/ssl/your-cert.cert|/etc/nginx/ssl/${CERT_BASENAME}.cert|g" \
  -e "s|/etc/nginx/ssl/your-cert.key|/etc/nginx/ssl/${CERT_BASENAME}.key|g" \
  "$TEMPLATE" > "$TARGET"

# ── 5. 启用 + 解决 default_server 冲突 ─────────────
# react vhost 不持有 default_server（同 VPS saas-nextjs/springboot 若占了 :80 default_server,
# react 这边重复声明 nginx -t 会直接报错 —— 务必先装 saas 并把 default 占位收掉，
# 或确认其他仓也明确不加 default_server）。
log "enable site, drop sites-enabled/default if no other default_server holder"
ln -sf "$TARGET" "/etc/nginx/sites-enabled/${DOMAIN}"
# 仅在 sites-enabled/default 真实存在 且 没有别的 vhost 持有 default_server 时删。
# 有的话留给那个 vhost 的 default_server 声明继续生效（防裸 IP 暴露归那个 vhost 管）。
if [ -f /etc/nginx/sites-enabled/default ] && ! grep -l "default_server" /etc/nginx/sites-enabled/* 2>/dev/null | grep -v "${DOMAIN}" >/dev/null; then
  rm -f /etc/nginx/sites-enabled/default
fi

# ── 6. nginx 检查 + reload ────────────────────────
log "nginx -t"
nginx -t
log "reload"
systemctl reload nginx

log "saas-react VPS 配置完成"
log "剩下手工:"
log "  1) cert: /etc/nginx/ssl/${CERT_BASENAME}.{crt,key}（复用 saas-nextjs 的可跳过）"
log "  2) ssh-copy-id -i ~/.ssh/id_ed25519_gh-deploy.pub deploy@\$(hostname -I | awk '{print \$1}')（saas-nextjs 已做可跳过）"
log "  3) saas-react repo GitHub Secrets: DOCKER_USERNAME / DOCKER_PASSWORD / VPS_HOST / VPS_USER / VPS_SSH_KEY"
log "     （react 不需要 DATABASE_URL —— 静态 SPA, 后端由 build-time VITE_API_BASE_URL 指定）"
