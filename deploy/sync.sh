#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:?Kullanım: ./deploy/sync.sh kullanici@sunucu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

rsync -az --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude uploads \
  --exclude .git \
  --exclude .env \
  "$ROOT/" "$REMOTE:/opt/nisan/"

ssh "$REMOTE" 'bash -s' <<'EOF'
set -euo pipefail
cd /opt/nisan
npm ci
npm run build
sudo systemctl restart nisan
sudo systemctl --no-pager --full status nisan | head -n 20
EOF
