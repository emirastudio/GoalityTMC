-- Migration 0006: Global clubs and teams
-- Клубы и команды становятся глобальными сущностями.
-- Все турнирно-специфичные данные переезжают в tournament_registrations.
--
-- ВАЖНО: запускать целиком как одну транзакцию.
-- Перед запуском сделать pg_dump!

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 1: Создаём таблицу tournament_registrations
-- ══════════════════════════════════════════════════════════════

CREATE TABLE tournament_registrations (
  id                    SERIAL PRIMARY KEY,
  team_id               INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id         INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  class_id              INTEGER REFERENCES tournament_classes(id) ON DELETE SET NULL,
  reg_number            INTEGER NOT NULL,
  status                team_status NOT NULL DEFAULT 'draft',
  notes                 TEXT,
  hotel_id              INTEGER,
  accom_players         INTEGER DEFAULT 0,
  accom_staff           INTEGER DEFAULT 0,
  accom_accompanying    INTEGER DEFAULT 0,
  accom_check_in        TEXT,
  accom_check_out       TEXT,
  accom_notes           TEXT,
  accom_declined        BOOLEAN NOT NULL DEFAULT false,
  accom_confirmed       BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX registrations_tournament_reg_idx
  ON tournament_registrations(tournament_id, reg_number);
CREATE UNIQUE INDEX registrations_team_tournament_idx
  ON tournament_registrations(team_id, tournament_id);
CREATE INDEX idx_registrations_tournament ON tournament_registrations(tournament_id);
CREATE INDEX idx_registrations_team       ON tournament_registrations(team_id);
CREATE INDEX idx_registrations_class      ON tournament_registrations(class_id);

-- ══════════════════════════════════════════════════════════════
-- ШАГ 2: Переносим данные команд в tournament_registrations
-- Каждая существующая команда сейчас в ровно одном турнире → 1:1 маппинг
-- ══════════════════════════════════════════════════════════════

INSERT INTO tournament_registrations (
  team_id, tournament_id, class_id, reg_number, status, notes,
  hotel_id, accom_players, accom_staff, accom_accompanying,
  accom_check_in, accom_check_out, accom_notes,
  accom_declined, accom_confirmed, created_at, updated_at
)
SELECT
  id, tournament_id, class_id, reg_number, status, notes,
  hotel_id, accom_players, accom_staff, accom_accompanying,
  accom_check_in, accom_check_out, accom_notes,
  accom_declined, accom_confirmed, created_at, updated_at
FROM teams;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 3: Добавляем registration_id во все зависимые таблицы
-- ══════════════════════════════════════════════════════════════

ALTER TABLE payments                    ADD COLUMN registration_id INTEGER;
ALTER TABLE team_bookings               ADD COLUMN registration_id INTEGER;
ALTER TABLE orders                      ADD COLUMN registration_id INTEGER;
ALTER TABLE team_travel                 ADD COLUMN registration_id INTEGER;
ALTER TABLE package_assignments         ADD COLUMN registration_id INTEGER;
ALTER TABLE team_service_overrides      ADD COLUMN registration_id INTEGER;
ALTER TABLE team_package_item_overrides ADD COLUMN registration_id INTEGER;
ALTER TABLE team_message_reads          ADD COLUMN registration_id INTEGER;
ALTER TABLE message_recipients          ADD COLUMN registration_id INTEGER;
ALTER TABLE team_questions              ADD COLUMN registration_id INTEGER;
ALTER TABLE team_price_overrides        ADD COLUMN registration_id INTEGER;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 4: Заполняем registration_id через маппинг team_id → registration
-- ══════════════════════════════════════════════════════════════

UPDATE payments p
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = p.team_id;

UPDATE team_bookings tb
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tb.team_id;

UPDATE orders o
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = o.team_id;

UPDATE team_travel tt
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tt.team_id;

UPDATE package_assignments pa
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = pa.team_id;

UPDATE team_service_overrides tso
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tso.team_id;

UPDATE team_package_item_overrides tpio
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tpio.team_id;

UPDATE team_message_reads tmr
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tmr.team_id;

UPDATE message_recipients mr
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = mr.team_id;

UPDATE team_questions tq
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tq.team_id;

UPDATE team_price_overrides tpr
  SET registration_id = r.id
  FROM tournament_registrations r WHERE r.team_id = tpr.team_id;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 5: Ставим NOT NULL + FK constraints
-- ══════════════════════════════════════════════════════════════

ALTER TABLE payments                    ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_bookings               ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE orders                      ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_travel                 ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE package_assignments         ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_service_overrides      ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_package_item_overrides ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_message_reads          ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE message_recipients          ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_questions              ALTER COLUMN registration_id SET NOT NULL;
ALTER TABLE team_price_overrides        ALTER COLUMN registration_id SET NOT NULL;

ALTER TABLE payments                    ADD CONSTRAINT fk_payments_reg     FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_bookings               ADD CONSTRAINT fk_bookings_reg     FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE orders                      ADD CONSTRAINT fk_orders_reg       FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_travel                 ADD CONSTRAINT fk_travel_reg       FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE package_assignments         ADD CONSTRAINT fk_pkgassign_reg    FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_service_overrides      ADD CONSTRAINT fk_svcoverride_reg  FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_package_item_overrides ADD CONSTRAINT fk_pkgitemover_reg  FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_message_reads          ADD CONSTRAINT fk_msgreads_reg     FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE message_recipients          ADD CONSTRAINT fk_msgrecip_reg     FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_questions              ADD CONSTRAINT fk_questions_reg    FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;
ALTER TABLE team_price_overrides        ADD CONSTRAINT fk_priceoverride_reg FOREIGN KEY (registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE;

-- team_travel unique constraint: один travel на одну регистрацию
ALTER TABLE team_travel DROP CONSTRAINT IF EXISTS team_travel_team_id_key;
ALTER TABLE team_travel ADD CONSTRAINT team_travel_registration_id_key UNIQUE (registration_id);

-- package_assignments unique: один пакет на одну регистрацию
ALTER TABLE package_assignments DROP CONSTRAINT IF EXISTS package_assignments_team_id_key;
ALTER TABLE package_assignments ADD CONSTRAINT package_assignments_registration_id_key UNIQUE (registration_id);

-- ══════════════════════════════════════════════════════════════
-- ШАГ 6: Удаляем старые team_id колонки из финансовых таблиц
-- ══════════════════════════════════════════════════════════════

ALTER TABLE payments                    DROP COLUMN team_id;
ALTER TABLE team_bookings               DROP COLUMN team_id;
ALTER TABLE orders                      DROP COLUMN team_id;
ALTER TABLE team_travel                 DROP COLUMN team_id;
ALTER TABLE package_assignments         DROP COLUMN team_id;
ALTER TABLE team_service_overrides      DROP COLUMN team_id;
ALTER TABLE team_package_item_overrides DROP COLUMN team_id;
ALTER TABLE team_message_reads          DROP COLUMN team_id;
ALTER TABLE message_recipients          DROP COLUMN team_id;
ALTER TABLE team_questions              DROP COLUMN team_id;
ALTER TABLE team_price_overrides        DROP COLUMN team_id;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 7: Очищаем таблицу teams — убираем турнирно-специфичные поля
-- ══════════════════════════════════════════════════════════════

-- Удаляем уникальный индекс на (tournament_id, reg_number)
DROP INDEX IF EXISTS teams_tournament_reg_idx;

-- Убираем все турнирные колонки
ALTER TABLE teams DROP COLUMN IF EXISTS tournament_id;
ALTER TABLE teams DROP COLUMN IF EXISTS class_id;
ALTER TABLE teams DROP COLUMN IF EXISTS reg_number;
ALTER TABLE teams DROP COLUMN IF EXISTS status;
ALTER TABLE teams DROP COLUMN IF EXISTS notes;
ALTER TABLE teams DROP COLUMN IF EXISTS hotel_id;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_players;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_staff;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_accompanying;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_check_in;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_check_out;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_notes;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_declined;
ALTER TABLE teams DROP COLUMN IF EXISTS accom_confirmed;

-- Делаем club_id обязательным (если вдруг есть NULL)
UPDATE teams SET club_id = (SELECT id FROM clubs LIMIT 1) WHERE club_id IS NULL;
ALTER TABLE teams ALTER COLUMN club_id SET NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 8: Делаем clubs глобальными — убираем tournament_id
-- ══════════════════════════════════════════════════════════════

-- Добавляем новые глобальные поля
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Генерируем slug из name + id (гарантированно уникальный)
UPDATE clubs SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || id
  WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_idx ON clubs(slug);

-- Удаляем FK на tournament_id
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS clubs_tournament_id_tournaments_id_fk;
ALTER TABLE clubs DROP COLUMN IF EXISTS tournament_id;

-- ══════════════════════════════════════════════════════════════
-- ШАГ 9: Проверочные запросы (убедиться что данные целые)
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  orphan_regs INTEGER;
  orphan_payments INTEGER;
BEGIN
  -- Все регистрации должны иметь валидный team_id
  SELECT COUNT(*) INTO orphan_regs
    FROM tournament_registrations r
    LEFT JOIN teams t ON t.id = r.team_id
    WHERE t.id IS NULL;

  IF orphan_regs > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % orphan registrations found', orphan_regs;
  END IF;

  -- Все платежи должны иметь валидный registration_id
  SELECT COUNT(*) INTO orphan_payments
    FROM payments p
    LEFT JOIN tournament_registrations r ON r.id = p.registration_id
    WHERE r.id IS NULL;

  IF orphan_payments > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % payments with invalid registration_id', orphan_payments;
  END IF;

  RAISE NOTICE 'Migration 0006 verification passed OK';
END $$;

COMMIT;
