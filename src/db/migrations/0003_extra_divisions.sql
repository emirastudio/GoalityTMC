-- Migration 0003: Add extra_divisions_purchased to tournaments + extra_divisions to purchases

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "extra_divisions_purchased" integer DEFAULT 0 NOT NULL;

ALTER TABLE "tournament_purchases"
  ADD COLUMN IF NOT EXISTS "extra_divisions" integer DEFAULT 0 NOT NULL;
