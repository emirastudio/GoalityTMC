-- Migration: 0008_team_identity
-- Adds permanent team identity fields (birthYear + gender) and
-- tournament-specific alias/displayName to support multiple squads per tournament.

-- 1. Create gender enum
DO $$ BEGIN
  CREATE TYPE "team_gender" AS ENUM ('male', 'female', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add identity fields to teams
ALTER TABLE "teams"
  ADD COLUMN IF NOT EXISTS "birth_year" integer,
  ADD COLUMN IF NOT EXISTS "gender" "team_gender" NOT NULL DEFAULT 'male';

-- 3. Add squad fields to tournament_registrations
ALTER TABLE "tournament_registrations"
  ADD COLUMN IF NOT EXISTS "squad_alias" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "display_name" text;

-- 4. Drop old unique constraint (team_id, tournament_id)
DROP INDEX IF EXISTS "registrations_team_tournament_idx";

-- 5. Add new unique constraint (team_id, tournament_id, squad_alias)
--    Empty squad_alias = single squad (default behavior preserved)
--    Non-empty alias = second/third squad (e.g. 'Black', 'White')
CREATE UNIQUE INDEX IF NOT EXISTS "registrations_team_tournament_squad_idx"
  ON "tournament_registrations" ("team_id", "tournament_id", "squad_alias");
