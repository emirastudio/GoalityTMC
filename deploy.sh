#!/usr/bin/env bash
# Manual immutable deploy / rollback for Goality TMC.
#
#   ./deploy.sh                 → deploy ghcr image for current main HEAD
#   ./deploy.sh <git-sha>       → deploy a specific (already-built) image
#   ./deploy.sh --rollback      → re-run the previously running image
#
# Normal deploys are automatic: `git push origin main` → CI → "Build &
# push image" → "Deploy to production" workflow. Use this script only for
# manual/targeted deploys or emergency rollback. It NEVER builds — the
# server only pulls the prebuilt image from GHCR. Build happens in CI.
set -euo pipefail

REMOTE=root@goality.ee
OWNER=emirastudio
IMAGE="ghcr.io/${OWNER}/goalitytmc"

if [[ "${1:-}" == "--rollback" ]]; then
  echo "→ Rolling back to previous image on $REMOTE…"
  ssh "$REMOTE" bash -se <<'EOF'
set -euo pipefail
UP=/home/goality/app/public/uploads
ENVF=/home/goality/app/.env.local
PREV=$(docker inspect goality-app --format '{{ index .Config.Labels "prev" }}' 2>/dev/null || echo "")
[ -z "$PREV" ] && { echo "✗ no recorded previous image"; exit 1; }
echo "  previous = $PREV"
docker rm -f goality-app >/dev/null 2>&1 || true
docker run -d --name goality-app --network host -e PORT=3001 -e HOSTNAME=0.0.0.0 \
  --env-file "$ENVF" -v "$UP":/app/public/uploads --restart unless-stopped "$PREV" >/dev/null
sleep 6
curl -fsS --max-time 5 http://127.0.0.1:3001/api/version || { echo "✗ rollback unhealthy"; exit 1; }
echo "✓ rolled back"
EOF
  exit 0
fi

# ── Resolve target SHA ────────────────────────────────────────────────────────
SHA="${1:-}"
if [[ -z "$SHA" ]]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  [[ "$BRANCH" == "main" ]] || { echo "✗ on '$BRANCH', expected main (or pass an explicit SHA)"; exit 1; }
  git diff-index --quiet HEAD -- || { echo "✗ working tree dirty"; git status -s; exit 1; }
  SHA=$(git rev-parse HEAD)
fi
echo "→ Target image: ${IMAGE}:${SHA}"

DEPLOY_TS=$(date -u +%FT%TZ)
ssh "$REMOTE" "IMAGE=$IMAGE DEPLOY_SHA=$SHA DEPLOY_TS=$DEPLOY_TS bash -se" <<'EOF'
set -euo pipefail
IMG="${IMAGE}:${DEPLOY_SHA}"
UP=/home/goality/app/public/uploads
ENVF=/home/goality/app/.env.local
run_app() {
  docker rm -f goality-app >/dev/null 2>&1 || true
  docker run -d --name goality-app --network host -e PORT=3001 -e HOSTNAME=0.0.0.0 \
    --env-file "$ENVF" -v "$UP":/app/public/uploads \
    --label "prev=${1:-}" --restart unless-stopped "$2" >/dev/null
}
echo "→ GHCR login"
cat /home/goality/.ghcr-token | docker login ghcr.io -u emirastudio --password-stdin >/dev/null
PREV=$(docker inspect goality-app --format '{{.Config.Image}}' 2>/dev/null || echo "")
echo "→ Previous: ${PREV:-<none>}"
echo "→ Pull $IMG"
docker pull "$IMG" >/dev/null
echo "→ Migrate (idempotent)"
docker run --rm --network host --env-file "$ENVF" "$IMG" node scripts/migrate.mjs
echo "→ Swap"
run_app "$PREV" "$IMG"
OK=false
for i in $(seq 1 20); do
  sleep 3
  S=$(curl -fsS --max-time 5 http://127.0.0.1:3001/api/version 2>/dev/null \
       | python3 -c 'import json,sys;print(json.load(sys.stdin).get("sha","?"))' 2>/dev/null || echo "?")
  if [ "${S:0:7}" = "${DEPLOY_SHA:0:7}" ]; then OK=true; echo "  ✓ serving $S"; break; fi
done
if [ "$OK" != true ]; then
  echo "✗ unhealthy — rolling back to ${PREV:-<none>}"
  [ -n "$PREV" ] && run_app "" "$PREV"
  exit 1
fi
docker image prune -f >/dev/null 2>&1 || true
mkdir -p /home/goality/deploys
echo "${DEPLOY_TS}  ${DEPLOY_SHA}  manual" >> /home/goality/deploys/log.tsv
echo "✓ Deployed ${DEPLOY_SHA} (immutable, manual)"
EOF
