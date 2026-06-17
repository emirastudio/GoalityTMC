-- ═══════════════════════════════════════════════════════════
-- 0041_bug_reports
--
-- Internal QA tool. Floating button in admin shell lets tester
-- submit bugs from any page. Stored here, shown in
-- /admin/bug-reports, mirrored to a Telegram chat.
--
-- Purely additive: no existing table touched.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Enums ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE bug_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bug_status AS ENUM ('new', 'in_progress', 'fixed', 'wont_fix', 'duplicate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bug_reports (
  id serial PRIMARY KEY,
  organization_id integer REFERENCES organizations(id) ON DELETE SET NULL,
  reporter_id integer REFERENCES admin_users(id) ON DELETE SET NULL,
  reporter_email text NOT NULL,
  reporter_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  severity bug_severity NOT NULL DEFAULT 'medium',
  status bug_status NOT NULL DEFAULT 'new',
  page_url text NOT NULL,
  page_path text NOT NULL,
  user_agent text,
  viewport varchar(20),
  locale varchar(5),
  console_snapshot jsonb,
  screenshot_url text,
  assignee_id integer REFERENCES admin_users(id) ON DELETE SET NULL,
  internal_notes text,
  resolved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bug_reports_status_idx ON bug_reports (status);
CREATE INDEX IF NOT EXISTS bug_reports_severity_idx ON bug_reports (severity);
CREATE INDEX IF NOT EXISTS bug_reports_created_at_idx ON bug_reports (created_at);
CREATE INDEX IF NOT EXISTS bug_reports_reporter_idx ON bug_reports (reporter_id);

COMMIT;
