-- ═══════════════════════════════════════════════════════════
-- 0030_email_verifications
-- Per-email one-time codes used to prove ownership during
-- club-registration. The register endpoint now refuses to
-- create a clubUser unless a recent (≤30 min) verified row
-- exists for the typed email.
-- ═══════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS email_verifications (
  id           SERIAL PRIMARY KEY,
  email        TEXT      NOT NULL,
  code_hash    TEXT      NOT NULL,
  attempts     INTEGER   NOT NULL DEFAULT 0,
  expires_at   TIMESTAMP NOT NULL,
  verified_at  TIMESTAMP,
  used_at      TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email
  ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_active
  ON email_verifications(email, verified_at, used_at)
  WHERE used_at IS NULL;

COMMIT;
