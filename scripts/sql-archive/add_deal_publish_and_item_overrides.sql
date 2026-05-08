-- Offerings v3 — publish flag + per-line price overrides.
-- Additive; does not change existing columns.

ALTER TABLE team_offering_deals
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS deal_item_overrides (
  id                    SERIAL PRIMARY KEY,
  deal_id               INTEGER NOT NULL REFERENCES team_offering_deals(id) ON DELETE CASCADE,
  offering_id           INTEGER NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  price_cents_override  INTEGER NOT NULL,
  reason                TEXT,
  created_by            INTEGER,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS deal_item_overrides_unique_idx ON deal_item_overrides(deal_id, offering_id);
CREATE INDEX IF NOT EXISTS deal_item_overrides_deal_idx  ON deal_item_overrides(deal_id);
