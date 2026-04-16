-- Draw Show paywall: staging table for in-flight Stripe Checkout
-- sessions. We don't create the public_draws row until payment
-- confirms, so an abandoned cart leaves no orphaned draw.
--
-- Flow:
--   wizard submit → insert here + Stripe session → return checkoutUrl
--   stripe webhook (checkout.session.completed) → read here,
--     create public_draws + lead + event + email, delete this row.
--
-- expires_at is enforced by a cleanup job (or manual cron); Stripe
-- sessions themselves are valid for 30 min.
CREATE TABLE IF NOT EXISTS draw_pending_purchases (
  id                     serial      PRIMARY KEY,
  stripe_session_id      text        NOT NULL UNIQUE,
  state                  jsonb       NOT NULL,
  email                  text        NOT NULL,
  organization           text,
  promo_code             text,
  final_price_cents      integer     NOT NULL,
  discount_cents         integer     NOT NULL DEFAULT 0,
  ip                     text,
  user_agent             text,
  referrer               text,
  locale                 text,
  created_at             timestamp   NOT NULL DEFAULT NOW(),
  expires_at             timestamp   NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_draw_pending_purchases_expires_at ON draw_pending_purchases(expires_at);
