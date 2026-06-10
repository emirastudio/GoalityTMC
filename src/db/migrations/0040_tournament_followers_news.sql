-- ═══════════════════════════════════════════════════════════
-- 0040_tournament_followers_news
--
-- Follow Tournament + News Feed (V1, purely additive).
--
-- Клуб ставит «звезду» на турнире (tournament_followers) и начинает
-- получать новости, которые публикует организатор (tournament_news).
-- Рассылка идёт через существующий notification_queue с новым
-- kind="tournament_news_published"; worker (src/worker/notifications.ts)
-- получает новый case-branch без изменения старой ветки schedule_changed.
--
-- Параллельная схема, не пересекается с inbox_messages /
-- message_recipients / team_message_reads (которые работают через
-- registration_id). Здесь recipients = clubId, без зависимости от
-- регистрации команды.
--
-- Гарантия: ни одна существующая таблица не меняется (ALTER не вызывается).
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Followers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_followers (
  id serial PRIMARY KEY,
  club_id integer NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  tournament_id integer NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  unsubscribe_token text NOT NULL UNIQUE
);

CREATE UNIQUE INDEX IF NOT EXISTS tournament_followers_club_tournament_uq
  ON tournament_followers (club_id, tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_followers_tournament
  ON tournament_followers (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_followers_club
  ON tournament_followers (club_id);

-- ─── News posts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_news (
  id serial PRIMARY KEY,
  tournament_id integer NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  author_id integer REFERENCES admin_users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body_markdown text NOT NULL,
  cover_url text,
  cta_label text,
  cta_url text,
  status text NOT NULL DEFAULT 'draft',  -- draft|scheduled|published|archived
  publish_at timestamp,
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_news_tournament_status
  ON tournament_news (tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_tournament_news_status_publish_at
  ON tournament_news (status, publish_at);

-- ─── Read markers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_news_reads (
  id serial PRIMARY KEY,
  news_id integer NOT NULL REFERENCES tournament_news(id) ON DELETE CASCADE,
  club_id integer NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  read_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tournament_news_reads_news_club_uq
  ON tournament_news_reads (news_id, club_id);
CREATE INDEX IF NOT EXISTS idx_tournament_news_reads_club
  ON tournament_news_reads (club_id);

COMMIT;
