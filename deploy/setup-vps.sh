#!/bin/sh
# Usage: setup-vps.sh <domain>
#
# VPS 一次性 bootstrap (saas-identity-platform-react)。

set -eu

DOMAIN="${1:-saas-react.xiangru.uk}"

if [ "$(id -u)" -ne 0 ]; then
  echo "must run as root" >&2
  exit 2
fi

BASE="/home/deploy/saas-identity-platform-react"
NGINX_SITE="/etc/nginx/sites-enabled/saas-identity-platform-react.conf"
TEMPLATE="$(dirname "$0")/nginx-vps.conf.example"

echo "→ apt install docker.io"
apt-get update -qq
apt-get install -y docker.io

echo "→ create deploy user"
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
mkdir -p "$BASE"
chown -R deploy:deploy "$BASE"
echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker" >/etc/sudoers.d/deploy-docker

echo "→ render nginx vhost"
sed "s/<domain>/${DOMAIN}/g" "$TEMPLATE" >"$NGINX_SITE"
nginx -t
systemctl reload nginx

echo "→ setup done"
echo "  deploy dir: $BASE"
echo "  domain:     $DOMAIN"