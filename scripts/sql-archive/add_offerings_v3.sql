-- Offerings v3 — unified model for services + packages + team deals.
-- Additive migration: does NOT touch legacy v1 (accommodationOptions etc.)
-- or v2 (servicePackages). Tournaments opt in via tournaments.offerings_v3_enabled.
--
-- Apply on server:
--   docker cp migrations/add_offerings_v3.sql goality-postgres:/tmp/m.sql
--   docker exec goality-postgres psql -U goality -d goality -f /tmp/m.sql

-- ─── Feature flag + payment instructions on tournaments ─────────────────
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS offerings_v3_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- ─── Enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE offering_kind AS ENUM ('single', 'package');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offering_inclusion AS ENUM ('required', 'default', 'optional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offering_price_model AS ENUM (
    'flat', 'per_team', 'per_person', 'per_player', 'per_staff',
    'per_accompanying', 'per_night', 'per_meal', 'per_unit'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deal_state AS ENUM ('proposed', 'accepted', 'declined', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_kind AS ENUM ('discount', 'surcharge');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_amount_mode AS ENUM ('fixed_cents', 'percent_bps', 'per_player');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── offerings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offerings (
  id                              SERIAL PRIMARY KEY,
  tournament_id                   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  kind                            offering_kind NOT NULL DEFAULT 'single',
  inclusion                       offering_inclusion NOT NULL DEFAULT 'optional',
  title                           TEXT NOT NULL,
  title_ru                        TEXT,
  title_et                        TEXT,
  description                     TEXT,
  description_ru                  TEXT,
  description_et                  TEXT,
  icon                            VARCHAR(16),
  price_model                     offering_price_model NOT NULL DEFAULT 'per_person',
  price_cents                     INTEGER NOT NULL DEFAULT 0,
  currency                        VARCHAR(3) NOT NULL DEFAULT 'EUR',
  package_price_override_cents    INTEGER,
  scope_class_ids                 JSONB,
  available_from                  TIMESTAMP,
  available_until                 TIMESTAMP,
  inventory_limit                 INTEGER,
  sort_order                      INTEGER NOT NULL DEFAULT 0,
  is_archived                     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS offerings_tournament_idx ON offerings(tournament_id);
CREATE INDEX IF NOT EXISTS offerings_kind_idx       ON offerings(kind);

-- ─── package_contents ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_contents (
  id                 SERIAL PRIMARY KEY,
  package_id         INTEGER NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  child_offering_id  INTEGER NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS package_contents_unique_idx ON package_contents(package_id, child_offering_id);
CREATE INDEX IF NOT EXISTS package_contents_package_idx       ON package_contents(package_id);

-- ─── team_offering_deals ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_offering_deals (
  id                  SERIAL PRIMARY KEY,
  registration_id     INTEGER NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  offering_id         INTEGER NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  state               deal_state NOT NULL DEFAULT 'proposed',
  due_date            DATE,
  cached_total_cents  INTEGER,
  created_by          INTEGER,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS team_offering_deals_unique_idx ON team_offering_deals(registration_id, offering_id);
CREATE INDEX IF NOT EXISTS team_offering_deals_reg_idx           ON team_offering_deals(registration_id);

-- ─── deal_adjustments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_adjustments (
  id                   SERIAL PRIMARY KEY,
  deal_id              INTEGER NOT NULL REFERENCES team_offering_deals(id) ON DELETE CASCADE,
  kind                 adjustment_kind NOT NULL,
  amount_mode          adjustment_amount_mode NOT NULL,
  amount_value         INTEGER NOT NULL,
  target_offering_id   INTEGER REFERENCES offerings(id) ON DELETE SET NULL,
  reason               TEXT NOT NULL,
  created_by           INTEGER,
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deal_adjustments_deal_idx ON deal_adjustments(deal_id);

-- ─── deal_payments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_payments (
  id             SERIAL PRIMARY KEY,
  deal_id        INTEGER NOT NULL REFERENCES team_offering_deals(id) ON DELETE CASCADE,
  amount_cents   INTEGER NOT NULL,
  currency       VARCHAR(3) NOT NULL DEFAULT 'EUR',
  method         payment_method NOT NULL DEFAULT 'bank_transfer',
  received_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  reference      TEXT,
  note           TEXT,
  recorded_by    INTEGER,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deal_payments_deal_idx ON deal_payments(deal_id);
