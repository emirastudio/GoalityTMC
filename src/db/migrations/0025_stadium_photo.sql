-- ═══════════════════════════════════════════════════════════
-- 0025_stadium_photo
-- Optional photo for a tournament stadium. Shown on team admin
-- pages and (eventually) the public tournament page.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournament_stadiums
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMIT;
