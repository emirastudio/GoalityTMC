-- Migration: Add subscription columns to listing_tournaments
-- Run on server: psql $DATABASE_URL -f migrate-listing-subscription.sql

ALTER TABLE listing_tournaments
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMP;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'listing_tournaments'
  AND column_name IN ('stripe_subscription_id', 'subscription_status', 'subscription_period_end');
