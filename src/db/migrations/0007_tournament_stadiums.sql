-- Migration: Add tournament_stadiums table and link fields to stadiums
-- Stadiums are parent venues; fields (площадки) are subdivisions of a stadium

CREATE TABLE IF NOT EXISTS "tournament_stadiums" (
  "id" serial PRIMARY KEY NOT NULL,
  "tournament_id" integer NOT NULL REFERENCES "tournaments"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "address" text,
  "contact_name" text,
  "contact_phone" text,
  "maps_url" text,
  "waze_url" text,
  "notes" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Link fields to a parent stadium (nullable: existing standalone fields stay as-is)
ALTER TABLE "tournament_fields"
  ADD COLUMN IF NOT EXISTS "stadium_id" integer REFERENCES "tournament_stadiums"("id") ON DELETE set null;
