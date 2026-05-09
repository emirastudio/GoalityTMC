-- ═══════════════════════════════════════════════════════════
-- 0034_preferred_locale
-- Each user-facing entity gets a preferred_locale column so the
-- email pipeline can render every message in the recipient's own
-- language. Captured at signup from the NEXT_LOCALE cookie; defaults
-- to 'en' so existing rows stay valid.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- organizations.default_locale already exists — that field plays the
-- same role for organizer-side messaging.
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'en';

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT NOT NULL DEFAULT 'en';

COMMIT;
