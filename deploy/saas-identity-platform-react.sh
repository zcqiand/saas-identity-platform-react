#!/bin/sh
# Usage: saas-identity-platform-react.sh <DOCKER_USERNAME> <DOCKER_PASSWORD> [VERSION]
#
# Vite SPA (nginx:alpine);HOST_PORT=8021;VPS nginx 反代 (saas-react.xiangru.uk)

set -eu

USERNAME="${1:-}"
PASSWORD="${2:-}"
VERSION="${3:-latest}"
IMAGE="${USERNAME}/saas-identity-platform-react:${VERSION}"
BASE="/home/deploy/saas-identity-platform-react"
CONTAINER_NAME="saas-identity-platform-react"
HOST_PORT=8021

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <DOCKER_USERNAME> <DOCKER_PASSWORD> [VERSION]" >&2
  exit 2
fi

echo "→ image: $IMAGE"
printf '%s' "$PASSWORD" | docker login -u "$USERNAME" --password-stdin
docker pull "$IMAGE"

echo "→ docker stop & rm $CONTAINER_NAME"
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "→ docker run"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:80" \
  "$IMAGE"

docker image prune -f
docker ps --filter name="$CONTAINER_NAME"
echo "→ deploy done at $(date -u)"