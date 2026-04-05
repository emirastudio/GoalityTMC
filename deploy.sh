#!/bin/bash
set -e
echo "→ Syncing files..."
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env*' --exclude='*.log' ./ root@goality.ee:/home/goality/app/

echo "→ Building (clean)..."
ssh root@goality.ee "cd /home/goality/app && rm -rf .next && pnpm build"

echo "→ Restarting PM2..."
ssh root@goality.ee "fuser -k 3001/tcp 2>/dev/null || true; sleep 1; pm2 restart goality --update-env"

echo "✓ Done"
