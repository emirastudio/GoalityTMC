-- ═══════════════════════════════════════════════════════════
-- 0022_v3_on_by_default
-- Offerings v3 is no longer a feature flag — it's THE offerings
-- system. Turn it on for every existing tournament and flip the
-- column default so new tournaments get it automatically.
-- Column stays so we can still read the flag (and, in theory,
-- disable for a specific tournament by direct SQL during support).
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournaments
  ALTER COLUMN offerings_v3_enabled SET DEFAULT true;

UPDATE tournaments SET offerings_v3_enabled = true
  WHERE offerings_v3_enabled = false;

COMMIT;
