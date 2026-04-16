-- Promo codes for the standalone /draw product. Superadmin creates
-- codes from /admin/draw-promos; the wizard accepts an optional code,
-- validates it server-side, and the share endpoint records the
-- discount in draw_show_events for funnel/revenue analytics.
--
-- discount_type:
--   'free'    → 100% discount, paid-status equivalents become 'promo'
--   'percent' → discount_value is 0..100 → percent off
--   'flat'    → discount_value is in cents (EUR), capped at price
--
-- max_uses NULL  = unlimited.
-- valid_from / valid_to NULL = no date bound.
-- disabled flag toggles availability without losing history.
CREATE TABLE IF NOT EXISTS draw_promo_codes (
  id              serial      PRIMARY KEY,
  code            text        NOT NULL UNIQUE,
  discount_type   text        NOT NULL CHECK (discount_type IN ('free', 'percent', 'flat')),
  discount_value  integer     NOT NULL DEFAULT 0,
  max_uses        integer,
  current_uses    integer     NOT NULL DEFAULT 0,
  valid_from      timestamp,
  valid_to        timestamp,
  disabled        boolean     NOT NULL DEFAULT false,
  notes           text,
  created_by      integer     REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      timestamp   NOT NULL DEFAULT NOW(),
  updated_at      timestamp   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draw_promo_codes_code     ON draw_promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_draw_promo_codes_disabled ON draw_promo_codes(disabled);
