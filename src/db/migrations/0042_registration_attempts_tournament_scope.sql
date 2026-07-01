-- ═══════════════════════════════════════════════════════════
-- 0042_registration_attempts_tournament_scope
--
-- registration_attempts had no tournament_id, so the admin
-- "Registration Log" page queried it with no WHERE clause —
-- every org saw every other org's registration attempts.
--
-- Purely additive: no existing table touched beyond one column.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE registration_attempts ADD COLUMN IF NOT EXISTS tournament_id integer;

CREATE INDEX IF NOT EXISTS registration_attempts_tournament_id_idx ON registration_attempts (tournament_id);

COMMIT;
