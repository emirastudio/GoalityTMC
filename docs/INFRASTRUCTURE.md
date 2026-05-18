# Goality TMC — Infrastructure & Operations Runbook

> Last major change: 2026-05-19. Migrated to **immutable deploy** + **3-layer
> backups (PITR)** + monitoring. This document is the source of truth for ops.
> If you change infra, update this file in the same commit.

---

## 1. TL;DR — the mental model

- **Build once, deploy anywhere.** CI builds ONE Docker image, pushes to GHCR.
  The server only `docker pull`s it. **The server never builds code.**
- **Prod app = Docker container `goality-app`** (not PM2).
- **Postgres = Docker container `goality-postgres`** with pgBackRest doing
  **continuous WAL archiving to Cloudflare R2** → point-in-time recovery.
- **3 independent backup layers** in different providers.
- Deploy = `git push origin main`. Everything else is automatic, with
  auto-rollback if health/smoke checks fail.

---

## 2. Server

| | |
|---|---|
| Provider | Hetzner Cloud |
| Plan | CX33 — 4 vCPU / 8 GB RAM / 40 GB disk |
| Public IPv4 | `204.168.219.216` |
| SSH | `ssh root@goality.ee` (NEVER `goality.app` — Cloudflare blocks SSH) |
| Hostname | `ubuntu-4gb-hel1-1` (Helsinki) |
| Hetzner Cloud Backups | **Enabled** (full-VM snapshot, 7 slots, daily) |

> Could run on the smaller CX23 (4 GB, €3.99) now — the server no longer
> builds, so OOM is impossible. Kept on CX33 for headroom.

### What runs on the server

| Thing | How | Port | Notes |
|---|---|---|---|
| `goality-app` | Docker container, `--network host`, `--restart unless-stopped` | 3001 | prod app, image `ghcr.io/emirastudio/goalitytmc:<sha>` |
| `goality-postgres` | Docker container, `--restart unless-stopped` | 5433→5432 | image `goality-postgres-pgbackrest:16`, volume `goality_pgdata` |
| `goality-staging` | **PM2** (id 1, `pnpm start -p 3002`) | 3002 | the only thing still in PM2 |
| nginx | system service (enabled) | 80/443 | reverse proxy → 3001 |
| Docker | system service (enabled) | — | auto-starts containers on boot |

Boot order is automatic: Docker (enabled) starts `goality-app` +
`goality-postgres` (`--restart unless-stopped`); `pm2-root` systemd unit
resurrects `goality-staging`; nginx starts itself.

> ⚠️ A hidden `goality.service` systemd unit used to run the OLD rsync
> build on :3001 and silently shadowed the container. It has been
> **stopped, disabled and deleted**. Do NOT recreate any systemd unit or
> PM2 process named `goality` on :3001 — it will fight the container.

---

## 3. Deploy pipeline (immutable)

```
git push origin main
   │
   ├─ CI (.github/workflows/ci.yml)
   │     lint (non-blocking) · typecheck (GATE) · pnpm test (GATE)
   │           │ on success
   ├─ Build & push image (.github/workflows/docker.yml)   ← gated on CI
   │     docker build (GitHub runner) → ghcr.io/emirastudio/goalitytmc:<sha> + :latest
   │           │ on success
   └─ Deploy to production (.github/workflows/deploy.yml)  ← gated on image
         ssh → docker pull → migrate (one-shot) → swap container
         → /api/version SHA check → smoke key routes → registration-integrity
         → AUTO-ROLLBACK to previous image if anything fails
```

- A failing typecheck or test **blocks the image build** → no deploy.
- `lint` is intentionally non-blocking (~200 pre-existing errors; clean
  incrementally on touched files, then flip `continue-on-error` off).
- Migrations run as an idempotent one-shot from the image:
  `docker run --rm ... <img> node scripts/migrate.mjs` (drizzle-orm migrator).
- Post-deploy smoke (in deploy.yml) curls `/en /ru /en/catalog`,
  a tournament page, a club page, the short `/register` redirect against
  the new container; any unexpected status → rollback.

### Manual deploy / rollback (`./deploy.sh`)

```bash
./deploy.sh                # deploy current main HEAD's image
./deploy.sh <git-sha>      # deploy a specific already-built image
./deploy.sh --rollback     # re-run the previously running image
```

The script never builds — it pulls the prebuilt GHCR image, runs the
idempotent migration, swaps the container, healthchecks, auto-rolls-back.

### Container run command (reference — used by deploy.yml & deploy.sh)

```bash
docker run -d --name goality-app --network host \
  -e PORT=3001 -e HOSTNAME=0.0.0.0 \
  --env-file /home/goality/app/.env.local \
  -v /home/goality/app/public/uploads:/app/public/uploads \
  --restart unless-stopped \
  ghcr.io/emirastudio/goalitytmc:<sha>
```

`public/uploads` is a **bind-mounted volume** — user uploads persist
across deploys (the image itself ships an empty uploads dir).

---

## 4. Database & PITR (pgBackRest → R2)

- `goality-postgres` runs the custom image `goality-postgres-pgbackrest:16`
  (`docker/postgres/Dockerfile` = `postgres:16-alpine` + `pgbackrest`).
  Volume `goality_pgdata` holds the data — **survives container swaps.**
- Postgres runs with: `archive_mode=on`,
  `archive_command=pgbackrest --stanza=goality archive-push %p`,
  `archive_timeout=60` → every WAL segment is shipped to R2 within ≤60 s.
- pgBackRest config (with R2 keys): `/home/goality/pgbackrest/pgbackrest.conf`
  (chmod 600, owned by uid:gid `70:70` = container's `postgres` user),
  bind-mounted read-only to `/etc/pgbackrest/pgbackrest.conf`.
- Base backups: **full Sun 03:00, diff Mon–Sat 03:30**
  (`/home/goality/monitoring/pgbackrest-backup.sh`, retention 4 full / 14 diff).
- **RPO ≤ 60 s, RTO ≈ 6 min** (verified by restore drill).

### Restore the whole DB to latest (disaster)

```bash
# fresh empty data dir, then:
docker exec -u postgres goality-postgres \
  pgbackrest --stanza=goality --delta restore
# start postgres → it replays archived WAL automatically
```

### Point-in-time restore (e.g. recover to before a bad migration)

```bash
docker exec -u postgres <pg-container> pgbackrest --stanza=goality \
  --type=time --target="2026-05-18 19:30:00+00" --delta restore
```

### Health / inspection

```bash
docker exec -u postgres goality-postgres pgbackrest --stanza=goality info
docker exec -u postgres goality-postgres pgbackrest --stanza=goality check
docker exec -e PGPASSWORD=goalitypass goality-postgres \
  psql -U goality -d goality -c '\dt'
```

> ⚠️ NEVER `docker volume rm goality_pgdata` — that is the live database.
> Swapping the PG container is safe (volume is external) but must keep the
> same `-v goality_pgdata:/var/lib/postgresql/data` + pgbackrest mounts +
> `-c archive_*` flags.

---

## 5. Backups — 3 independent layers

| Layer | What | Where | Schedule | Retention |
|---|---|---|---|---|
| 1. pgBackRest | Postgres full/diff + **continuous WAL** | Cloudflare R2 `goalitytmc-1/pgbackrest/` | full Sun 03:00, diff Mon–Sat 03:30, WAL continuous | 4 full / 14 diff |
| 2. Logical dump | `pg_dump` gz + `uploads` tar.gz | Cloudflare R2 `goalitytmc-1/db|uploads/` | daily 02:45 | 30 days |
| 3. VM snapshot | whole-server disk image | Hetzner Cloud | daily (Hetzner) | 7 slots |

- Layer 1 = best (point-in-time, ~60 s data loss max). Layer 2 = simple
  portable dumps. Layer 3 = whole-machine rollback. Two different cloud
  providers (Hetzner + Cloudflare) → provider-failure isolation.
- Off-site dump script: `/home/goality/monitoring/backup-offsite.sh`
  (validates the dump, verifies the object landed, alerts Telegram on fail).
- A local copy of one dump lives at `~/goality-offsite-backup/` (dev machine).

### Restore the daily logical dump

```bash
rclone copy r2:goalitytmc-1/db/<file>.sql.gz ./
gzip -dc <file>.sql.gz | docker exec -i -e PGPASSWORD=goalitypass \
  goality-postgres psql -U goality -d goality
rclone copy r2:goalitytmc-1/uploads/<file>.tar.gz ./   # uploads if needed
```

`rclone` is configured for R2 at `/root/.config/rclone/rclone.conf`
(remote `r2`, chmod 600).

---

## 6. Monitoring & alerting

| Channel | What it watches | Cadence |
|---|---|---|
| Telegram `@goalityTMC_bot` | site HTTP, `goality-app` container status/restarts, RAM, disk, stray builds, off-site & pgBackRest backup freshness | alert on state-change every 5 min; full summary every 6 h |
| Email (Resend) | `/api/version` reachable + SHA matches latest deploy | every 2 min, alert after 3 fails |
| Backup scripts | self-alert to Telegram on any backup failure | per backup run |

- Telegram bot creds: `/home/goality/monitoring/tg.env` (chmod 600).
  Monitor script: `/home/goality/monitoring/tg-monitor.sh` (`alert` / `summary`).
- 🟢 OK / 🟠 ISSUES / 🚨 ALERT — trust it; false-alarm sources were removed.

---

## 7. Secrets on the server (all chmod 600, NOT in git / rsync)

| File | Purpose |
|---|---|
| `/home/goality/app/.env.local` | app runtime secrets (DB url, JWT, Stripe, Resend) |
| `/home/goality/.ghcr-token` | GHCR pull token (read:packages PAT) |
| `/home/goality/pgbackrest/pgbackrest.conf` | pgBackRest + R2 keys (owner 70:70) |
| `/root/.config/rclone/rclone.conf` | rclone R2 keys (off-site dump) |
| `/home/goality/monitoring/tg.env` | Telegram bot token + chat id |

`NEXT_PUBLIC_*` values are baked into the image at CI build time (they are
public by definition). Server-only secrets are injected at runtime via
`--env-file .env.local` — never baked into the image.

---

## 8. Common runbooks

**Deploy a fix:** `git push origin main` → watch GitHub Actions
(CI → Build & push image → Deploy to production). Done.

**Roll back NOW:** `./deploy.sh --rollback` (or re-deploy a known-good SHA:
`./deploy.sh <sha>`).

**App container unhealthy:**
```bash
ssh root@goality.ee
docker inspect goality-app --format '{{.State.Status}} {{.RestartCount}}'
docker logs --tail 50 goality-app
# nothing else should hold :3001:
ss -tlnp | grep ':3001 '
```

**Postgres down / restore:** see §4. Volume `goality_pgdata` is the data;
pgBackRest in R2 is the recovery source.

**Full server lost (rebuild from scratch):**
1. New Hetzner box, install Docker, nginx, rclone, restore secrets (§7).
2. `pgbackrest --stanza=goality --delta restore` from R2 → start PG.
3. `docker login ghcr.io` + `./deploy.sh <last-good-sha>`.
4. Restore nginx config + DNS. Verify smoke routes.

**Disk filling from WAL:** means archiving is broken (R2 unreachable /
creds). `pgbackrest --stanza=goality check`; fix R2 access; PG resumes
shipping & trims `pg_wal`. Telegram will have alerted.

---

## 9. What is NOT done (future / Tier 2 — only when traffic demands)

Single server = no automatic failover if the hardware dies (≈10–15 min
manual recovery, **but no data loss** thanks to §4/§5). Horizontal scale
(load balancer + N app nodes + Postgres replica + uploads → object
storage/CDN) is deliberately deferred — premature for current load.
