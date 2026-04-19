-- ═══════════════════════════════════════════════════════════
-- 0023_offering_nights_count
-- Per-offering nights override for the `per_night` price model.
-- By default the calculator derives nights from the tournament
-- (class dates → fallback tournament dates). Sometimes the organiser
-- sells a fixed package: «Hotell, 3 ночи» regardless of how long the
-- tournament runs. `nights_count` stores that override.
-- NULL → auto from tournament; N → use N nights directly.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS nights_count integer;

COMMIT;
