-- ═══════════════════════════════════════════════════════════
-- 0024_hotel_photo
-- Photo URL for a tournament hotel (optional). Shown on the team
-- admin page as a background/thumb next to navigation buttons.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournament_hotels
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMIT;
