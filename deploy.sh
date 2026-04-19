#!/bin/bash
set -e
echo "→ Syncing files..."
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='.env*' --exclude='*.log' ./ root@goality.ee:/home/goality/app/

echo "→ Building (clean)..."
ssh root@goality.ee "cd /home/goality/app && rm -rf .next && pnpm build"

echo "→ Reloading PM2..."
ssh root@goality.ee "pm2 reload goality --update-env"

echo "✓ Done"
