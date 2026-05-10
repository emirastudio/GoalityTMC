-- ═══════════════════════════════════════════════════════════
-- 0036_es_locale_rollout
-- Adds Spanish (es) variants for all organizer-authored multilingual
-- content tables that didn't get them in 0035 (which only covered
-- offerings + offering templates).
--
-- Also adds the missing Estonian (et) variants on blog_posts — that
-- table had only EN/RU before, which broke i18n parity.
--
-- All new columns are nullable; existing rows stay valid; reads fall
-- back to the base column via `pickLocaleText()`.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Legacy v2.5 service tables ────────────────────────────────────
ALTER TABLE accommodation_options
  ADD COLUMN IF NOT EXISTS name_es      text,
  ADD COLUMN IF NOT EXISTS meal_note_es text;

ALTER TABLE extra_meal_options
  ADD COLUMN IF NOT EXISTS name_es        text,
  ADD COLUMN IF NOT EXISTS description_es text;

ALTER TABLE transfer_options
  ADD COLUMN IF NOT EXISTS name_es        text,
  ADD COLUMN IF NOT EXISTS description_es text;

ALTER TABLE registration_fees
  ADD COLUMN IF NOT EXISTS name_es text;

-- ─── Tournament structure (organizer-named stages and rounds) ──────
ALTER TABLE tournament_stages
  ADD COLUMN IF NOT EXISTS name_es varchar(100);

ALTER TABLE match_rounds
  ADD COLUMN IF NOT EXISTS name_es varchar(50);

-- ─── Blog: add the missing ET tier + brand-new ES tier ─────────────
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS title_et            text,
  ADD COLUMN IF NOT EXISTS content_et          text,
  ADD COLUMN IF NOT EXISTS excerpt_et          text,
  ADD COLUMN IF NOT EXISTS seo_title_et        text,
  ADD COLUMN IF NOT EXISTS seo_description_et  text,
  ADD COLUMN IF NOT EXISTS title_es            text,
  ADD COLUMN IF NOT EXISTS content_es          text,
  ADD COLUMN IF NOT EXISTS excerpt_es          text,
  ADD COLUMN IF NOT EXISTS seo_title_es        text,
  ADD COLUMN IF NOT EXISTS seo_description_es  text;

COMMIT;
