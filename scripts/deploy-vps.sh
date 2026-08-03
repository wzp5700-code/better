#!/bin/bash
# First-time VPS setup for personal-growth-desk.
#
# Run on the VPS as a non-root user (e.g., `deploy`) AFTER:
#   - Docker + docker compose plugin are installed
#   - The user is in the `docker` group
#   - DNS A record for DOMAIN points at this VPS
#
# Usage:
#   ./scripts/deploy-vps.sh /path/to/fcm.json
#   ./scripts/deploy-vps.sh  # skip FCM setup
#
# Idempotent: safe to re-run.

set -euo pipefail

REPO="${REPO:-https://github.com/wzp5700-code/better.git}"
APP_DIR="${APP_DIR:-$HOME/personal-growth-desk}"
DOMAIN="${DOMAIN:?Set DOMAIN env var (e.g., DOMAIN=app.example.com)}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://${DOMAIN}}"
FCM_JSON_PATH="${1:-}"

# 1. Clone or update repo
if [ -d "$APP_DIR" ]; then
  echo "[deploy-vps] updating $APP_DIR"
  cd "$APP_DIR"
  git pull --ff-only
else
  echo "[deploy-vps] cloning $REPO to $APP_DIR"
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# 2. Write .env
cat > .env <<EOF
DATABASE_URL=./data/app.db
NEXT_PUBLIC_APP_NAME=个人成长台
DOMAIN=${DOMAIN}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
PUSH_CHECK_INTERVAL_MS=60000
EOF

# 3. FCM service account (optional)
if [ -n "$FCM_JSON_PATH" ] && [ -f "$FCM_JSON_PATH" ]; then
  mkdir -p secrets
  cp "$FCM_JSON_PATH" secrets/fcm.json
  chmod 600 secrets/fcm.json
  echo "[deploy-vps] FCM service account installed"
else
  echo "[deploy-vps] no FCM service account — push notifications disabled"
fi

# 4. Build + start
mkdir -p data backups
docker compose -f docker/docker-compose.yml pull || true
docker compose -f docker/docker-compose.yml up -d --build

echo ""
echo "[deploy-vps] done. wait ~30s for Caddy to obtain a TLS cert, then visit:"
echo "  https://${DOMAIN}/"
echo ""
echo "first-time setup:"
echo "  open the URL, click 'Create master device', copy the token."