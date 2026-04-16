-- Lead capture + audit log for the standalone /draw product.
--
-- public_draw_leads:
--   • Captured on wizard submit (the email gate makes this mandatory).
--   • Each row is one consent event from one visitor; the same email
--     can appear multiple times if they create multiple draws.
--
-- draw_show_events:
--   • Append-only journal of every meaningful action: visited (landing
--     loaded), created (wizard submitted), activated (stage actually
--     played). Status is tracked separately so superadmin can see
--     conversion + payment mode.

CREATE TABLE IF NOT EXISTS public_draw_leads (
  id              serial      PRIMARY KEY,
  draw_id         text        REFERENCES public_draws(id) ON DELETE SET NULL,
  email           text        NOT NULL,
  organization    text,
  consented_at    timestamp   NOT NULL DEFAULT NOW(),
  ip              text,
  user_agent      text,
  referrer        text,
  locale          text,
  created_at      timestamp   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_draw_leads_email      ON public_draw_leads(email);
CREATE INDEX IF NOT EXISTS idx_public_draw_leads_created_at ON public_draw_leads(created_at);

CREATE TABLE IF NOT EXISTS draw_show_events (
  id              serial      PRIMARY KEY,
  -- visited | created | activated
  event_type      text        NOT NULL,
  -- free_standalone | free_plan | paid | promo
  status          text        NOT NULL DEFAULT 'free_standalone',
  draw_id         text        REFERENCES public_draws(id) ON DELETE SET NULL,
  email           text,
  promo_code      text,
  ip              text,
  user_agent      text,
  referrer        text,
  locale          text,
  meta            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamp   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draw_show_events_event_type ON draw_show_events(event_type);
CREATE INDEX IF NOT EXISTS idx_draw_show_events_status     ON draw_show_events(status);
CREATE INDEX IF NOT EXISTS idx_draw_show_events_email      ON draw_show_events(email);
CREATE INDEX IF NOT EXISTS idx_draw_show_events_created_at ON draw_show_events(created_at);
