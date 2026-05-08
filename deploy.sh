#!/usr/bin/env bash
# Production deploy: goality.ee:/home/goality/app
#
# Safe deploy pipeline:
#   1. Local: refuse if branch != main, working tree dirty, or unpushed commits
#   2. Remote: rsync files (respects .rsync-exclude)
#   3. Remote: pnpm install --frozen-lockfile
#   4. Remote: drizzle-kit migrate (apply DB migrations BEFORE serving new code)
#   5. Remote: pnpm build
#   6. Remote: pm2 reload goality --update-env
#   7. Remote: smoke test the app responds
#
# Use deploy-staging.sh for /home/goality/staging on port 3002.

set -euo pipefail

REMOTE_HOST=root@goality.ee
REMOTE_PATH=/home/goality/app
PM2_NAME=goality
EXPECTED_BRANCH=main
HEALTH_URL=http://127.0.0.1:3001/api/admin/platform/health
SMOKE_URL=http://127.0.0.1:3001/

# ─── 1. Local safety checks ───────────────────────────────────────────────────
echo "→ Local safety checks..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "$EXPECTED_BRANCH" ]]; then
  echo "✗ refusing to deploy: on branch '$BRANCH', expected '$EXPECTED_BRANCH'"
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  echo "✗ refusing to deploy: working tree has uncommitted changes"
  git status -s
  exit 1
fi

git fetch origin "$EXPECTED_BRANCH" --quiet
LOCAL=$(git rev-parse "$EXPECTED_BRANCH")
REMOTE=$(git rev-parse "origin/$EXPECTED_BRANCH")
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "✗ refusing to deploy: local main ($LOCAL) != origin/main ($REMOTE)"
  echo "  push or pull first"
  exit 1
fi

DEPLOY_SHA=$(git rev-parse --short HEAD)
DEPLOY_TS=$(date -u +%FT%TZ)
echo "  deploying $DEPLOY_SHA at $DEPLOY_TS"

# ─── 2. Sync files ────────────────────────────────────────────────────────────
echo "→ Sync files..."
rsync -avz --delete-after \
  --exclude-from=.rsync-exclude \
  ./ "$REMOTE_HOST:$REMOTE_PATH/"

# ─── 3-6. Remote pipeline ─────────────────────────────────────────────────────
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

echo "→ Reload PM2..."
pm2 reload $PM2_NAME --update-env

echo "→ Wait for app to come back..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS --max-time 3 "$SMOKE_URL" >/dev/null 2>&1; then
    echo "  ✓ app responding (attempt \$i)"
    break
  fi
  if [[ \$i -eq 10 ]]; then
    echo "✗ app not responding after 30s — check 'pm2 logs $PM2_NAME'"
    exit 1
  fi
  sleep 3
done

echo "→ Health check..."
curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null && echo "  ✓ health OK" || echo "  ⚠ health endpoint not responding (non-fatal)"

echo "→ Record deploy:"
mkdir -p /home/goality/deploys
echo "$DEPLOY_TS  $DEPLOY_SHA" >> /home/goality/deploys/log.tsv
EOF

echo "✓ Deployed $DEPLOY_SHA → https://goality.ee"
