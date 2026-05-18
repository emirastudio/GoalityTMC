# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Immutable build for Goality TMC (Next.js 16, standalone output).
# Built ONCE in CI, pushed to ghcr.io, pulled & run unchanged on the server.
# The server never compiles anything.
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_IMAGE=node:22-alpine

# ── deps: full install (needs dev deps to build) ─────────────────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── builder: compile Next.js into .next/standalone ───────────────────────────
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SHA/timestamp baked into the client bundle (powers /api/version).
ARG NEXT_PUBLIC_DEPLOY_SHA=unknown
ARG NEXT_PUBLIC_BUILT_AT=unknown
ENV NEXT_PUBLIC_DEPLOY_SHA=${NEXT_PUBLIC_DEPLOY_SHA} \
    NEXT_PUBLIC_BUILT_AT=${NEXT_PUBLIC_BUILT_AT} \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── runner: tiny runtime, no source, no dev tooling ──────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# Next standalone server + static assets + public files.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migration assets: SQL files + journal + the migrator script + the two
# packages the migrator needs (drizzle-orm/postgres are prod deps; copying
# them whole guarantees the migrator submodule is present even though the
# app only imports a subset that nft would otherwise trace).
COPY --from=builder --chown=nextjs:nodejs /app/src/db/migrations ./src/db/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/postgres ./node_modules/postgres

USER nextjs
EXPOSE 3001

# Default = run the app. Migrations run as a one-shot overriding the CMD:
#   docker run --rm ... <image> node scripts/migrate.mjs
CMD ["node", "server.js"]
