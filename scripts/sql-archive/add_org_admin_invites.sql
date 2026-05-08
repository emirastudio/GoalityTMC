-- Org admin invites table (Pro+Elite multi-admin feature).
-- Apply on server: docker exec -i goality-postgres psql -U goality -d goality < migrations/add_org_admin_invites.sql
CREATE TABLE IF NOT EXISTS org_admin_invites (
  id              SERIAL      PRIMARY KEY,
  organization_id INTEGER     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token           TEXT        NOT NULL UNIQUE,
  invited_email   TEXT        NOT NULL,
  invited_name    TEXT,
  invited_by      INTEGER     NOT NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMP   NOT NULL,
  used_at         TIMESTAMP,
  revoked_at      TIMESTAMP
);
CREATE INDEX IF NOT EXISTS org_admin_invites_org_idx   ON org_admin_invites(organization_id);
CREATE INDEX IF NOT EXISTS org_admin_invites_email_idx ON org_admin_invites(invited_email);
