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

<<<<<<< Updated upstream
set -euo pipefail
=======
echo "→ Installing dependencies..."
ssh root@goality.ee "cd /home/goality/app && pnpm install --frozen-lockfile"

echo "→ Building (clean)..."
ssh root@goality.ee "cd /home/goality/app && rm -rf .next && pnpm build"
>>>>>>> Stashed changes

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

DEPLOY_SHA=$(git rev-parse HEAD)
DEPLOY_SHA_SHORT=$(git rev-parse --short HEAD)
DEPLOY_TS=$(date -u +%FT%TZ)
echo "  deploying $DEPLOY_SHA_SHORT at $DEPLOY_TS"

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

echo "→ Build (clean) — bake SHA into bundle..."
rm -rf .next
NEXT_PUBLIC_DEPLOY_SHA="$DEPLOY_SHA" \
NEXT_PUBLIC_BUILT_AT="$DEPLOY_TS" \
  pnpm build

echo "→ Kill any non-PM2 process on port 3001 (defensive)..."
PM2_PID=\$(pm2 jlist 2>/dev/null | python3 -c '
import json, sys
procs = json.load(sys.stdin)
for p in procs:
  if p.get("name") == "$PM2_NAME":
    print(p.get("pid", 0))
    break
' 2>/dev/null || echo 0)
for pid in \$(ss -tlnp 2>/dev/null | grep ":3001 " | grep -oP "pid=\K[0-9]+" | sort -u); do
  if [[ "\$pid" != "\$PM2_PID" ]] && [[ "\$pid" != "0" ]]; then
    echo "  killing orphan pid \$pid (pm2 pid is \$PM2_PID)"
    kill "\$pid" 2>/dev/null || true
  fi
done

echo "→ Reload PM2..."
pm2 reload $PM2_NAME --update-env

echo "→ Wait for PM2 status = online..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  STATUS=\$(pm2 jlist 2>/dev/null | python3 -c '
import json, sys
procs = json.load(sys.stdin)
for p in procs:
  if p.get("name") == "$PM2_NAME":
    env = p.get("pm2_env", {}) or {}
    print(env.get("status", "unknown"))
    break
else:
  print("not_found")
')
  if [[ "\$STATUS" == "online" ]]; then
    echo "  ✓ pm2 status: online"
    break
  fi
  if [[ \$i -eq 10 ]]; then
    echo "✗ pm2 status stuck at '\$STATUS' — see 'pm2 logs $PM2_NAME'"
    pm2 logs $PM2_NAME --lines 30 --nostream
    exit 1
  fi
  sleep 3
done

echo "→ Smoke test via /api/version (verifies SHA, not just port)..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  VERSION_JSON=\$(curl -fsS --max-time 5 http://127.0.0.1:3001/api/version 2>/dev/null || echo '{}')
  SERVING_SHA=\$(echo "\$VERSION_JSON" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("sha","?"))' 2>/dev/null || echo "?")
  if [[ "\$SERVING_SHA" == "$DEPLOY_SHA" ]]; then
    echo "  ✓ /api/version reports \$SERVING_SHA — matches deploy"
    break
  fi
  if [[ \$i -eq 10 ]]; then
    echo "✗ /api/version SHA mismatch. Expected $DEPLOY_SHA, got \$SERVING_SHA"
    exit 1
  fi
  sleep 3
done

echo "→ Record deploy:"
mkdir -p /home/goality/deploys
echo "$DEPLOY_TS  $DEPLOY_SHA_SHORT" >> /home/goality/deploys/log.tsv
EOF

echo "✓ Deployed $DEPLOY_SHA → https://goality.ee"
