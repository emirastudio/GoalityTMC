-- ═══════════════════════════════════════════════════════════
-- 0029_club_user_teams
-- Junction table: a single club_user can manage multiple teams.
-- Backfilled from existing club_users.team_id (1:1 → 1:many).
-- club_users.team_id stays — semantic shift: it's now the
-- "currently active" team for the session, not the only team.
-- ═══════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS club_user_teams (
  id SERIAL PRIMARY KEY,
  club_user_id INTEGER NOT NULL REFERENCES club_users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (club_user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_club_user_teams_user ON club_user_teams(club_user_id);
CREATE INDEX IF NOT EXISTS idx_club_user_teams_team ON club_user_teams(team_id);

-- Backfill: every existing team-scoped clubUser gets one junction row.
INSERT INTO club_user_teams (club_user_id, team_id)
  SELECT id, team_id FROM club_users WHERE team_id IS NOT NULL
  ON CONFLICT DO NOTHING;

COMMIT;
