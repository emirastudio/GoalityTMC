#!/usr/bin/env bash
# Staging deploy: goality.ee:/home/goality/staging (PM2 name: goality-staging, port 3002)
#
# Lighter than deploy.sh — no main-branch guard, allows deploying any branch
# for testing. DB migrations still run.
#
# First-time setup:
#   pm2 start "pnpm start -p 3002" --name goality-staging --cwd /home/goality/staging
#   pm2 save

set -euo pipefail

REMOTE_HOST=root@goality.ee
REMOTE_PATH=/home/goality/staging
PM2_NAME=goality-staging
PORT=3002

BRANCH=$(git rev-parse --abbrev-ref HEAD)
DEPLOY_SHA=$(git rev-parse --short HEAD)
echo "→ Deploying branch '$BRANCH' ($DEPLOY_SHA) to staging..."

echo "→ Sync files..."
rsync -avz --delete-after \
  --exclude-from=.rsync-exclude \
  ./ "$REMOTE_HOST:$REMOTE_PATH/"

ssh "$REMOTE_HOST" bash -se <<EOF
set -euo pipefail

cd $REMOTE_PATH

echo "→ Install deps (frozen)..."
pnpm install --frozen-lockfile

echo "→ Run DB migrations..."
export DATABASE_URL=\$(grep '^DATABASE_URL=' .env.local | head -1 | cut -d= -f2-)
if [[ -z "\$DATABASE_URL" ]]; then
  echo "✗ DATABASE_URL missing in .env.local"
  exit 1
fi
timeout 180 pnpm drizzle-kit migrate

echo "→ Build (clean)..."
rm -rf .next
pnpm build

echo "→ Reload PM2 (or start if not running)..."
pm2 reload $PM2_NAME --update-env || \
  pm2 start "pnpm start -p $PORT" --name $PM2_NAME --cwd $REMOTE_PATH

echo "→ Wait for app to come back..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 3 "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    echo "  ✓ staging responding"
    break
  fi
  if [[ \$i -eq 10 ]]; then
    echo "✗ staging not responding — check 'pm2 logs $PM2_NAME'"
    exit 1
  fi
  sleep 3
done
EOF

echo "✓ Staging deployed → http://goality.ee:$PORT (or staging.goality.ee if proxied)"
