-- ═══════════════════════════════════════════════════════════
-- 0031_club_user_teams_status
-- Trust-by-default + admin-side moderation: a coach who joined
-- an EXISTING team via the public registration starts as
-- "pending" — the club admin sees them on /club/dashboard and
-- can either approve (mark them confirmed) or reject (kick).
-- The status DOES NOT gate access — the coach can register the
-- team for tournaments and manage it immediately. The status is
-- just a moderation hint for the club admin.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- All historical rows (backfilled in 0029) are considered approved.
ALTER TABLE club_user_teams
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS idx_club_user_teams_pending
  ON club_user_teams(team_id)
  WHERE status = 'pending';

COMMIT;
