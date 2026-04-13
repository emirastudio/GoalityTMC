-- 0005_max_teams.sql
-- Add maxTeams field to tournament_classes

ALTER TABLE "tournament_classes"
  ADD COLUMN IF NOT EXISTS "max_teams" integer;
