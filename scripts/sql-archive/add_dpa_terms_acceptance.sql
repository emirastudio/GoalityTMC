-- Adds GDPR Art. 28 DPA and Terms acceptance audit columns to organizations.
-- Apply on server: docker exec -i goality-postgres psql -U goality -d goality < migrations/add_dpa_terms_acceptance.sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS dpa_accepted_at     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dpa_version         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS terms_accepted_at   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS terms_version       VARCHAR(20),
  ADD COLUMN IF NOT EXISTS legal_acceptance_ip VARCHAR(64);
