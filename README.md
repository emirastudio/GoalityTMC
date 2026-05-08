# Goality TMC

Tournament management platform — Next.js 16 + Drizzle ORM + Postgres + JWT auth + next-intl (en/ru/et/es) + Resend email + Stripe billing.

Multi-tenant (org slugs in URLs), runs as a single Node process behind nginx + PM2 on a single VPS.

## Quickstart

Prerequisites: Node 22+, pnpm 10+, Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Postgres (port 5433)
docker compose up -d

# 3. Configure env
cp .env.example .env.local
# Edit .env.local — at minimum set RESEND_API_KEY (for email flows)

# 4. Apply schema
pnpm db:migrate

# 5. (optional) Seed
pnpm db:seed

# 6. Run dev server
pnpm dev          # → http://localhost:7171
```

> Local dev runs on **port 7171** (production is on 3001 via PM2; keeping them separate avoids conflicts when running both locally).

## Common scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server (Turbopack) on port 7171 |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed dev data |
| `pnpm i18n:check` | Verify all locale files have the same key set |

## Repository layout

```
src/
  app/             Next.js App Router (pages + API routes)
    [locale]/      Localized pages (en/ru/et/es)
    api/           Backend endpoints
  components/      React components (admin, public, draw-show, referee, …)
  db/              Drizzle schema + migrations
    migrations/    SQL files (0000–0028) + meta/_journal.json
  i18n/            next-intl config
  messages/        en.json, ru.json, et.json, es.json
  lib/             Shared utilities (email, rate-limit, scheduling, …)
scripts/           Maintenance scripts (i18n check, seed helpers, …)
.github/workflows/ CI + auto-deploy
deploy.sh          Manual prod deploy (requires clean main + push)
deploy-staging.sh  Staging deploy (any branch, port 3002)
```

## Deployment

Two paths:

1. **Auto** — push to `main`. CI runs (`.github/workflows/ci.yml`); on green, `deploy.yml` rsyncs to prod, runs migrations, builds, reloads PM2, smoke-tests.
2. **Manual** — from a clean `main` checked out locally, `./deploy.sh`. The script refuses if your branch isn't `main`, the working tree is dirty, or `origin/main` has unpushed commits.

Production lives at `goalityfootball.com` (PM2 process `goality`, port 3001). Aliases `goality.ee`, `goality.app`, `goality.kingscup.ee` all 301 there.

Staging: `goality-staging` PM2 process, port 3002, deploy via `./deploy-staging.sh` from any branch.

## Migrations

Drizzle reads `src/db/migrations/meta/_journal.json` as the source of truth. After editing `src/db/schema.ts`:

```bash
pnpm db:generate           # creates a new NNNN_*.sql file + updates journal
pnpm db:migrate            # applies pending migrations to local DB
git add src/db/migrations  # commit BOTH the SQL file and journal change
```

## i18n

Four locales: `en`, `ru`, `et`, `es`. All keys must exist in all locales — `pnpm i18n:check` enforces this.

## Tech notes

- Auth: custom JWT in httpOnly cookie. NextAuth is installed but not wired in yet.
- Email: Resend (was Nodemailer/SMTP — migrated).
- Tracker: PostHog (via PR #8).
- File uploads: stored in `public/uploads/` (excluded from rsync to prod — never overwritten).
