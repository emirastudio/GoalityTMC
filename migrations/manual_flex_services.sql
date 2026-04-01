-- Manual migration: Flexible Services & Packages model
-- Run on production: psql $DATABASE_URL -f manual_flex_services.sql

-- 1. Add missing columns to service_packages (safe to run even if they exist)
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS description_ru text;
ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS description_et text;

-- 2. Create pricing_mode enum (skip if already exists)
DO $$ BEGIN
  CREATE TYPE pricing_mode AS ENUM (
    'per_person',
    'per_player',
    'per_staff',
    'per_accompanying',
    'per_team',
    'per_person_per_day',
    'per_unit',
    'flat'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create services table
CREATE TABLE IF NOT EXISTS services (
  id          serial PRIMARY KEY,
  tournament_id integer NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name        text NOT NULL,
  name_ru     text,
  name_et     text,
  icon        text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamp NOT NULL DEFAULT now()
);

-- 4. Create package_items table
CREATE TABLE IF NOT EXISTS package_items (
  id            serial PRIMARY KEY,
  package_id    integer NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  service_id    integer NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  details       text,
  details_ru    text,
  details_et    text,
  pricing_mode  pricing_mode NOT NULL DEFAULT 'per_person',
  price         decimal(10, 2) NOT NULL DEFAULT 0,
  days          integer,
  quantity      integer,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamp NOT NULL DEFAULT now()
);

-- 5. Create team_package_item_overrides table
CREATE TABLE IF NOT EXISTS team_package_item_overrides (
  id               serial PRIMARY KEY,
  team_id          integer NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  package_item_id  integer NOT NULL REFERENCES package_items(id) ON DELETE CASCADE,
  custom_price     decimal(10, 2),
  custom_quantity  integer,
  is_disabled      boolean NOT NULL DEFAULT false,
  reason           text,
  created_at       timestamp NOT NULL DEFAULT now()
);
