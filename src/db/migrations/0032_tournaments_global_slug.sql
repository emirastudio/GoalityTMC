-- ═══════════════════════════════════════════════════════════
-- 0032_tournaments_global_slug
-- Make tournament slugs globally unique so URLs can drop the
-- /[orgSlug]/ segment. Was: UNIQUE (org_id, slug). Now: UNIQUE (slug)
-- + a partial unique index limited to non-deleted rows so a slug
-- frees up after a tournament is soft-deleted.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Drop the old composite uniqueness.
DROP INDEX IF EXISTS tournaments_org_slug_idx;

-- New uniqueness: slug must be globally unique among LIVE tournaments.
-- Soft-deleted rows can keep their slug (no clash with new tournaments
-- that re-use the freed name).
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_slug_unique_live
  ON tournaments(slug)
  WHERE deleted_at IS NULL;

COMMIT;
