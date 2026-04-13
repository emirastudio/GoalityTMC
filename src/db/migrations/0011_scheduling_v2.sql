-- Migration: 0011_scheduling_v2
-- Complete rewrite of the tournament scheduling subsystem.
-- Adds: referees roster + availability, team blackouts, match-referee join,
--       schedule runs (durable state machine / audit log), notification queue.
-- Extends: matches table with lock + buffer columns.
-- Non-destructive: no existing tables are dropped. Public pages that read
-- matches.scheduled_at / field_id keep working unchanged.

-- ─── matches: lock + per-match buffer overrides ───────────────────────────
ALTER TABLE "matches"
  ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "locked_by_user_id" INTEGER REFERENCES "admin_users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "lock_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "buffer_before_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "buffer_after_minutes" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_matches_locked"
  ON "matches" ("tournament_id", "locked_at");

-- ─── tournament_referees: roster per tournament ───────────────────────────
CREATE TABLE IF NOT EXISTS "tournament_referees" (
  "id" SERIAL PRIMARY KEY,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "organization_id" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "level" TEXT,
  "color_tag" TEXT,
  "notes" TEXT,
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_tournament_referees_tournament"
  ON "tournament_referees" ("tournament_id");

-- ─── referee_availability: per-day available / blackout windows ───────────
CREATE TABLE IF NOT EXISTS "referee_availability" (
  "id" SERIAL PRIMARY KEY,
  "referee_id" INTEGER NOT NULL REFERENCES "tournament_referees"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "start_time" TEXT,
  "end_time" TEXT,
  "is_blackout" BOOLEAN NOT NULL DEFAULT FALSE,
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "idx_referee_availability_referee"
  ON "referee_availability" ("referee_id", "date");

-- ─── team_blackouts: dates / windows a team cannot play ───────────────────
CREATE TABLE IF NOT EXISTS "team_blackouts" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INTEGER NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "start_time" TEXT,
  "end_time" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_team_blackouts_tournament_date"
  ON "team_blackouts" ("tournament_id", "date");
CREATE INDEX IF NOT EXISTS "idx_team_blackouts_team"
  ON "team_blackouts" ("team_id");

-- ─── match_referees: M:N between matches and referees ────────────────────
CREATE TABLE IF NOT EXISTS "match_referees" (
  "match_id" INTEGER NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "referee_id" INTEGER NOT NULL REFERENCES "tournament_referees"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_match_referees_pk"
  ON "match_referees" ("match_id", "referee_id");
CREATE INDEX IF NOT EXISTS "idx_match_referees_referee"
  ON "match_referees" ("referee_id");

-- ─── schedule_runs: durable solver state machine + audit log ──────────────
CREATE TABLE IF NOT EXISTS "schedule_runs" (
  "id" VARCHAR(32) PRIMARY KEY,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "organization_id" INTEGER NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "class_id" INTEGER REFERENCES "tournament_classes"("id") ON DELETE CASCADE,
  "parent_run_id" VARCHAR(32),
  "status" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "input_hash" TEXT NOT NULL,
  "params" JSONB NOT NULL,
  "result_summary" JSONB,
  "result" JSONB,
  "error" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_by_user_id" INTEGER REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "started_at" TIMESTAMP,
  "finished_at" TIMESTAMP,
  "applied_at" TIMESTAMP,
  "applied_by_user_id" INTEGER REFERENCES "admin_users"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_schedule_runs_tournament"
  ON "schedule_runs" ("tournament_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_schedule_runs_status"
  ON "schedule_runs" ("status");
CREATE INDEX IF NOT EXISTS "idx_schedule_runs_input_hash"
  ON "schedule_runs" ("input_hash");

-- ─── notification_queue: in-process outgoing drain loop ───────────────────
CREATE TABLE IF NOT EXISTS "notification_queue" (
  "id" SERIAL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "target_type" TEXT NOT NULL,
  "target_id" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "sent_at" TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_notification_queue_pending"
  ON "notification_queue" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notification_queue_tournament"
  ON "notification_queue" ("tournament_id");
