-- ═══════════════════════════════════════════════════════════
-- 0043_offering_inclusion_package_only
--
-- Add 'package_only' to offering_inclusion enum.
-- Semantics:
--   required     — shown to every club, auto-attached to all
--                   registrations (see backfillRequiredDeals()).
--   default      — added by default, club may remove.
--   optional     — club adds manually from the catalog.
--   package_only — never shown standalone; only usable as a
--                   package component.
--
-- Purely additive — no existing rows touched.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TYPE offering_inclusion ADD VALUE IF NOT EXISTS 'package_only';

COMMIT;
