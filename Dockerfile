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
# Build-time env. NEXT_PUBLIC_* are compiled into the client bundle, so
# they must be the REAL prod values (they are non-secret by definition).
# Server-only secrets get dummy values here purely so module-level
# constructors (e.g. `new Resend(...)`) don't throw while Next collects
# page data — the REAL secrets are injected at runtime via --env-file,
# never baked into the image.
ENV NEXT_PUBLIC_DEPLOY_SHA=${NEXT_PUBLIC_DEPLOY_SHA} \
    NEXT_PUBLIC_BUILT_AT=${NEXT_PUBLIC_BUILT_AT} \
    NEXT_PUBLIC_APP_URL=https://goalityfootball.com \
    NEXT_PUBLIC_BASE_URL=https://goalityfootball.com \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    JWT_SECRET=build-only-not-used-at-runtime \
    RESEND_API_KEY=re_build_dummy \
    EMAIL_FROM="Goality <noreply@send.goalityfootball.com>"
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
