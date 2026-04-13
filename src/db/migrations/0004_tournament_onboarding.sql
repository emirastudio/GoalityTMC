-- 0004_tournament_onboarding.sql
-- Add onboarding fields to tournaments table

ALTER TABLE "tournaments"
  ADD COLUMN IF NOT EXISTS "country" text,
  ADD COLUMN IF NOT EXISTS "city" text,
  ADD COLUMN IF NOT EXISTS "specific_days" text,
  ADD COLUMN IF NOT EXISTS "has_accommodation" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "has_meals" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "has_transfer" boolean NOT NULL DEFAULT false;
