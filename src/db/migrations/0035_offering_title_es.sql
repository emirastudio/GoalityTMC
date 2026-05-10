-- ═══════════════════════════════════════════════════════════
-- 0035_offering_title_es
-- Add Spanish (es) variants for organizer-authored title/description on
-- offerings + organization_offering_templates. Other localized tables
-- (products, packages, accommodation_options, blog_posts, etc.) get
-- their own *_es columns in follow-up migrations as the corresponding
-- admin forms migrate to the new MultilangInput component.
--
-- All new columns are nullable — existing rows stay valid; UI falls
-- back to the base (English) value via `pickLocaleText()`.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS title_es       text,
  ADD COLUMN IF NOT EXISTS description_es text;

ALTER TABLE organization_offering_templates
  ADD COLUMN IF NOT EXISTS title_es       text,
  ADD COLUMN IF NOT EXISTS description_es text;

COMMIT;
