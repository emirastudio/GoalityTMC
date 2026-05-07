-- ═══════════════════════════════════════════════════════════
-- 0028_referee_token
-- Add access_token column to tournament_referees for public
-- referee mobile panel links (no login required).
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournament_referees ADD COLUMN IF NOT EXISTS access_token text UNIQUE;

COMMIT;
