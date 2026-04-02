-- ═══════════════════════════════════════════════════════════
-- GAME LOGIC — Безопасная миграция (только новые таблицы)
-- Применять: psql $DATABASE_URL -f 0001_game_logic.sql
-- ═══════════════════════════════════════════════════════════

-- ─── Новые enum типы ───────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "stage_type" AS ENUM('group','knockout','league','swiss','double_elim');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "stage_status" AS ENUM('pending','active','finished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "match_status" AS ENUM('scheduled','live','finished','postponed','cancelled','walkover');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "match_result_type" AS ENUM('regular','extra_time','penalties','walkover','technical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "match_event_type" AS ENUM('goal','own_goal','yellow','red','yellow_red','penalty_scored','penalty_missed','substitution_in','substitution_out','injury');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Этапы турнира ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournament_stages" (
  "id"              serial PRIMARY KEY,
  "tournament_id"   integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name"            varchar(100) NOT NULL,
  "name_ru"         varchar(100),
  "name_et"         varchar(100),
  "type"            "stage_type" NOT NULL,
  "order"           integer NOT NULL,
  "status"          "stage_status" DEFAULT 'pending' NOT NULL,
  "settings"        jsonb DEFAULT '{}',
  "tiebreakers"     jsonb DEFAULT '["head_to_head_points","head_to_head_goal_diff","goal_diff","goals_scored","fair_play"]',
  "created_at"      timestamp DEFAULT now() NOT NULL,
  "updated_at"      timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stages_tournament"    ON "tournament_stages"("tournament_id");
CREATE INDEX IF NOT EXISTS "idx_stages_organization"  ON "tournament_stages"("organization_id");

-- ─── Группы ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stage_groups" (
  "id"            serial PRIMARY KEY,
  "stage_id"      integer NOT NULL REFERENCES "tournament_stages"("id") ON DELETE CASCADE,
  "tournament_id" integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "name"          varchar(20) NOT NULL,
  "order"         integer DEFAULT 0 NOT NULL,
  "created_at"    timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stage_groups_stage" ON "stage_groups"("stage_id");

-- ─── Команды в группах ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "group_teams" (
  "id"          serial PRIMARY KEY,
  "group_id"    integer NOT NULL REFERENCES "stage_groups"("id") ON DELETE CASCADE,
  "team_id"     integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "seed_number" integer,
  CONSTRAINT "group_teams_unique" UNIQUE("group_id","team_id")
);

-- ─── Раунды плей-офф ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "match_rounds" (
  "id"              serial PRIMARY KEY,
  "stage_id"        integer NOT NULL REFERENCES "tournament_stages"("id") ON DELETE CASCADE,
  "name"            varchar(50) NOT NULL,
  "name_ru"         varchar(50),
  "name_et"         varchar(50),
  "short_name"      varchar(10),
  "order"           integer NOT NULL,
  "match_count"     integer DEFAULT 1 NOT NULL,
  "is_two_legged"   boolean DEFAULT false NOT NULL,
  "has_third_place" boolean DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_match_rounds_stage" ON "match_rounds"("stage_id");

-- ─── Матчи ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "matches" (
  "id"               serial PRIMARY KEY,
  "tournament_id"    integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "organization_id"  integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "stage_id"         integer NOT NULL REFERENCES "tournament_stages"("id") ON DELETE CASCADE,
  "group_id"         integer REFERENCES "stage_groups"("id") ON DELETE SET NULL,
  "round_id"         integer REFERENCES "match_rounds"("id") ON DELETE SET NULL,
  "match_number"     integer,
  "home_team_id"     integer REFERENCES "teams"("id") ON DELETE SET NULL,
  "away_team_id"     integer REFERENCES "teams"("id") ON DELETE SET NULL,
  "field_id"         integer REFERENCES "tournament_fields"("id") ON DELETE SET NULL,
  "scheduled_at"     timestamp,
  "started_at"       timestamp,
  "finished_at"      timestamp,
  "status"           "match_status" DEFAULT 'scheduled' NOT NULL,
  "home_score"       integer,
  "away_score"       integer,
  "home_extra_score" integer,
  "away_extra_score" integer,
  "home_penalties"   integer,
  "away_penalties"   integer,
  "winner_id"        integer REFERENCES "teams"("id") ON DELETE SET NULL,
  "result_type"      "match_result_type",
  "is_public"        boolean DEFAULT true NOT NULL,
  "notes"            text,
  "version"          integer DEFAULT 0 NOT NULL,
  "created_at"       timestamp DEFAULT now() NOT NULL,
  "updated_at"       timestamp DEFAULT now() NOT NULL,
  "deleted_at"       timestamp
);

CREATE INDEX IF NOT EXISTS "idx_matches_tournament_status" ON "matches"("tournament_id","status");
CREATE INDEX IF NOT EXISTS "idx_matches_org_scheduled"     ON "matches"("organization_id","scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_matches_home_team"         ON "matches"("home_team_id");
CREATE INDEX IF NOT EXISTS "idx_matches_away_team"         ON "matches"("away_team_id");
CREATE INDEX IF NOT EXISTS "idx_matches_field_time"        ON "matches"("field_id","scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_matches_stage"             ON "matches"("stage_id");
CREATE INDEX IF NOT EXISTS "idx_matches_group"             ON "matches"("group_id");

-- ─── Протокол матча ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "match_events" (
  "id"               serial PRIMARY KEY,
  "match_id"         integer NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "tournament_id"    integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "team_id"          integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "person_id"        integer REFERENCES "people"("id") ON DELETE SET NULL,
  "event_type"       "match_event_type" NOT NULL,
  "minute"           integer NOT NULL,
  "minute_extra"     integer,
  "assist_person_id" integer REFERENCES "people"("id") ON DELETE SET NULL,
  "notes"            text,
  "created_at"       timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_match_events_match"      ON "match_events"("match_id");
CREATE INDEX IF NOT EXISTS "idx_match_events_tournament" ON "match_events"("tournament_id");
CREATE INDEX IF NOT EXISTS "idx_match_events_person"     ON "match_events"("person_id");

-- ─── Составы ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "match_lineup" (
  "id"          serial PRIMARY KEY,
  "match_id"    integer NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "team_id"     integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "person_id"   integer NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
  "is_starting" boolean DEFAULT true NOT NULL,
  "shirt_number" integer,
  "position"    varchar(30),
  "rating"      numeric(3,1),
  CONSTRAINT "match_lineup_unique" UNIQUE("match_id","person_id")
);

CREATE INDEX IF NOT EXISTS "idx_match_lineup_match" ON "match_lineup"("match_id");

-- ─── Таблица группы (precomputed) ──────────────────────────

CREATE TABLE IF NOT EXISTS "standings" (
  "id"            serial PRIMARY KEY,
  "group_id"      integer NOT NULL REFERENCES "stage_groups"("id") ON DELETE CASCADE,
  "tournament_id" integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "team_id"       integer NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "played"        integer DEFAULT 0 NOT NULL,
  "won"           integer DEFAULT 0 NOT NULL,
  "drawn"         integer DEFAULT 0 NOT NULL,
  "lost"          integer DEFAULT 0 NOT NULL,
  "goals_for"     integer DEFAULT 0 NOT NULL,
  "goals_against" integer DEFAULT 0 NOT NULL,
  "goal_diff"     integer DEFAULT 0 NOT NULL,
  "points"        integer DEFAULT 0 NOT NULL,
  "position"      integer,
  "form"          jsonb DEFAULT '[]',
  "head_to_head"  jsonb DEFAULT '{}',
  "updated_at"    timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "standings_group_team_unique" UNIQUE("group_id","team_id")
);

CREATE INDEX IF NOT EXISTS "idx_standings_tournament" ON "standings"("tournament_id");

-- ─── Правила квалификации ──────────────────────────────────

CREATE TABLE IF NOT EXISTS "qualification_rules" (
  "id"              serial PRIMARY KEY,
  "from_stage_id"   integer NOT NULL REFERENCES "tournament_stages"("id") ON DELETE CASCADE,
  "target_stage_id" integer NOT NULL REFERENCES "tournament_stages"("id") ON DELETE CASCADE,
  "from_rank"       integer NOT NULL,
  "to_rank"         integer NOT NULL,
  "target_slot"     varchar(50),
  "condition"       jsonb DEFAULT '{}'
);

-- ─── Слоты плей-офф ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stage_slots" (
  "id"                 serial PRIMARY KEY,
  "stage_id"           integer NOT NULL REFERENCES "tournament_stages"("id") ON DELETE CASCADE,
  "group_id"           integer REFERENCES "stage_groups"("id") ON DELETE SET NULL,
  "round_id"           integer REFERENCES "match_rounds"("id") ON DELETE SET NULL,
  "slot_label"         varchar(100),
  "slot_label_ru"      varchar(100),
  "slot_label_et"      varchar(100),
  "slot_position"      varchar(10),
  "filled_by_team_id"  integer REFERENCES "teams"("id") ON DELETE SET NULL,
  "order"              integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stage_slots_stage" ON "stage_slots"("stage_id");

-- ─── Audit log результатов ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "match_result_log" (
  "id"            serial PRIMARY KEY,
  "match_id"      integer NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "changed_by"    integer REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "old_home_score" integer,
  "old_away_score" integer,
  "new_home_score" integer,
  "new_away_score" integer,
  "old_status"    "match_status",
  "new_status"    "match_status",
  "reason"        text,
  "created_at"    timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_result_log_match" ON "match_result_log"("match_id");

-- ═══════════════════════════════════════════════════════════
-- ГОТОВО: 11 новых таблиц + 5 новых enum типов
-- Существующие таблицы НЕ ЗАТРОНУТЫ
-- ═══════════════════════════════════════════════════════════
