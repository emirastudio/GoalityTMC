-- ═══════════════════════════════════════════════════════════
-- MONETIZATION: Plans, Purchases, Subscriptions, Audit
-- ═══════════════════════════════════════════════════════════

-- Step 1: Add new enums
CREATE TYPE "public"."tournament_plan" AS ENUM('free', 'starter', 'pro', 'elite');
CREATE TYPE "public"."elite_sub_status" AS ENUM('active', 'trialing', 'past_due', 'cancelled');
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'completed', 'refunded', 'expired');

-- Step 2: Fix org_plan enum (free/basic/premium → free/starter/pro/elite)
-- Rename old enum
ALTER TYPE "public"."org_plan" RENAME TO "org_plan_old";
-- Create correct enum
CREATE TYPE "public"."org_plan" AS ENUM('free', 'starter', 'pro', 'elite');
-- Migrate organizations.plan column
ALTER TABLE "organizations"
  ADD COLUMN "plan_new" "org_plan" DEFAULT 'free' NOT NULL;
UPDATE "organizations" SET "plan_new" = CASE
  WHEN "plan"::text = 'premium' THEN 'pro'::"org_plan"
  WHEN "plan"::text = 'basic'   THEN 'starter'::"org_plan"
  ELSE 'free'::"org_plan"
END;
ALTER TABLE "organizations" DROP COLUMN "plan";
ALTER TABLE "organizations" RENAME COLUMN "plan_new" TO "plan";
DROP TYPE "org_plan_old";

-- Step 3: Add Stripe + Elite subscription fields to organizations
ALTER TABLE "organizations"
  ADD COLUMN "stripe_customer_id"                  text,
  ADD COLUMN "elite_sub_id"                        text,
  ADD COLUMN "elite_sub_status"                    "elite_sub_status",
  ADD COLUMN "elite_sub_period_end"                timestamp;

-- Step 4: Add plan + override fields to tournaments
ALTER TABLE "tournaments"
  ADD COLUMN "plan"                    "tournament_plan" DEFAULT 'free' NOT NULL,
  ADD COLUMN "extra_teams_purchased"   integer DEFAULT 0 NOT NULL,
  ADD COLUMN "plan_override_by"        integer REFERENCES "admin_users"("id") ON DELETE SET NULL,
  ADD COLUMN "plan_override_reason"    text,
  ADD COLUMN "plan_override_at"        timestamp;

-- Step 5: tournament_purchases — one-time Stripe payments per tournament
CREATE TABLE "tournament_purchases" (
  "id"                        serial PRIMARY KEY,
  "tournament_id"             integer NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "organization_id"           integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "stripe_checkout_session_id" text UNIQUE,
  "stripe_payment_intent_id"  text UNIQUE,
  "plan"                      "tournament_plan" NOT NULL,
  "extra_teams"               integer DEFAULT 0 NOT NULL,
  "amount_eur_cents"          integer NOT NULL,
  "status"                    "purchase_status" DEFAULT 'pending' NOT NULL,
  "completed_at"              timestamp,
  "metadata"                  jsonb DEFAULT '{}',
  "created_at"                timestamp DEFAULT now() NOT NULL,
  "updated_at"                timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "tp_tournament_idx" ON "tournament_purchases" ("tournament_id");
CREATE INDEX "tp_org_idx"        ON "tournament_purchases" ("organization_id");
CREATE INDEX "tp_session_idx"    ON "tournament_purchases" ("stripe_checkout_session_id");
CREATE INDEX "tp_intent_idx"     ON "tournament_purchases" ("stripe_payment_intent_id");

-- Step 6: platform_subscriptions — Elite monthly/yearly Stripe subscriptions
CREATE TABLE "platform_subscriptions" (
  "id"                        serial PRIMARY KEY,
  "organization_id"           integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "stripe_subscription_id"    text NOT NULL UNIQUE,
  "stripe_customer_id"        text NOT NULL,
  "stripe_price_id"           text NOT NULL,
  "billing_interval"          text NOT NULL,
  "status"                    "elite_sub_status" DEFAULT 'active' NOT NULL,
  "current_period_start"      timestamp NOT NULL,
  "current_period_end"        timestamp NOT NULL,
  "cancel_at_period_end"      boolean DEFAULT false NOT NULL,
  "cancelled_at"              timestamp,
  "created_at"                timestamp DEFAULT now() NOT NULL,
  "updated_at"                timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "ps_org_idx"  ON "platform_subscriptions" ("organization_id");
CREATE INDEX "ps_sub_idx"  ON "platform_subscriptions" ("stripe_subscription_id");

-- Step 7: plan_override_audits — full audit trail
CREATE TABLE "plan_override_audits" (
  "id"            serial PRIMARY KEY,
  "entity_type"   text NOT NULL,   -- 'tournament' | 'organization'
  "entity_id"     integer NOT NULL,
  "entity_name"   text NOT NULL,
  "admin_id"      integer NOT NULL REFERENCES "admin_users"("id"),
  "admin_email"   text NOT NULL,
  "previous_plan" text NOT NULL,
  "new_plan"      text NOT NULL,
  "reason"        text NOT NULL,
  "ip_address"    text,
  "created_at"    timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "poa_entity_idx" ON "plan_override_audits" ("entity_type", "entity_id");
CREATE INDEX "poa_admin_idx"  ON "plan_override_audits" ("admin_id");
CREATE INDEX "poa_time_idx"   ON "plan_override_audits" ("created_at" DESC);

-- Step 8: stripe_webhook_events — idempotency guard
CREATE TABLE "stripe_webhook_events" (
  "id"           text PRIMARY KEY,  -- Stripe event id (evt_...)
  "type"         text NOT NULL,
  "processed_at" timestamp DEFAULT now() NOT NULL,
  "payload"      jsonb NOT NULL
);

-- ═══════════════════════════════════════════════════════════
-- DONE: 4 new tables, 3 new enums, org_plan fixed, tournaments extended
-- ═══════════════════════════════════════════════════════════
