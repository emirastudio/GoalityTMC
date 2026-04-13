-- Migration: 0010_stadium_schedule
-- Adds group_round to matches (tour number within group stage).
-- Adds tournament_stadium_schedule table (per-stadium opening hours per date).

ALTER TABLE "matches"
  ADD COLUMN IF NOT EXISTS "group_round" INTEGER;

CREATE TABLE IF NOT EXISTS "tournament_stadium_schedule" (
  "id" SERIAL PRIMARY KEY,
  "tournament_id" INTEGER NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "stadium_id" INTEGER NOT NULL REFERENCES "tournament_stadiums"("id") ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  "start_time" TEXT,
  "end_time" TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS "tournament_stadium_schedule_uniq"
  ON "tournament_stadium_schedule" ("tournament_id", "stadium_id", "date");
