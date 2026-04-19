-- ═══════════════════════════════════════════════════════════
-- 0018_tournament_roster_pivot
-- Per-tournament roster + privacy for children
-- Применять: psql $DATABASE_URL -f 0018_tournament_roster_pivot.sql
--
-- Назначение:
--   1. Вынести поездочные поля с people на новую pivot-таблицу
--      registration_people (per-tournament: галки «в протокол / в отель»,
--      номер футболки, ответственный, аллергии, медицина).
--   2. Обнулить email/phone для детей (person_type='player') и
--      запретить их через CHECK constraint.
--   3. Удалить с people лишние поля (7 колонок) и счётчики проживания
--      с tournament_registrations (теперь считаем из pivot).
--
-- ВАЖНО: matchLineup.person_id и matchEvents.person_id не трогаем —
-- they продолжают ссылаться на people.id (якорь статистики).
--
-- Перед выкаткой ОБЯЗАТЕЛЬНО:
--   pg_dump + CSV-дамп tournament_registrations и people в /backups/pre-0018/
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Создаём pivot-таблицу ──────────────────────────────
CREATE TABLE IF NOT EXISTS registration_people (
  id                       serial      PRIMARY KEY,
  registration_id          integer     NOT NULL
    REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  person_id                integer     NOT NULL
    REFERENCES people(id) ON DELETE CASCADE,
  included_in_roster       boolean     NOT NULL DEFAULT true,
  needs_hotel              boolean     NOT NULL DEFAULT false,
  shirt_number             integer,
  is_responsible_on_site   boolean     NOT NULL DEFAULT false,
  allergies                text,
  dietary_requirements     text,
  medical_notes            text,
  created_at               timestamp   NOT NULL DEFAULT now(),
  updated_at               timestamp   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS registration_people_unique
  ON registration_people(registration_id, person_id);
CREATE INDEX IF NOT EXISTS idx_registration_people_registration
  ON registration_people(registration_id);
CREATE INDEX IF NOT EXISTS idx_registration_people_person
  ON registration_people(person_id);

-- ─── 2. Backfill: для каждой регистрации × каждого человека команды ──
-- Копируем текущие значения с people (которые скоро удалим).
-- ON CONFLICT DO NOTHING — безопасно при повторном запуске миграции.
INSERT INTO registration_people (
  registration_id, person_id, included_in_roster,
  needs_hotel, shirt_number, is_responsible_on_site,
  allergies, dietary_requirements, medical_notes
)
SELECT
  r.id, p.id, true,
  p.needs_hotel, p.shirt_number, p.is_responsible_on_site,
  p.allergies, p.dietary_requirements, p.medical_notes
FROM tournament_registrations r
JOIN people p ON p.team_id = r.team_id
ON CONFLICT (registration_id, person_id) DO NOTHING;

-- ─── 3. Sanity check: регистрации с accomPlayers>0, но без галок ──
DO $$
DECLARE
  mismatch_count integer;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM tournament_registrations r
  WHERE COALESCE(r.accom_players, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM registration_people rp
      WHERE rp.registration_id = r.id AND rp.needs_hotel = true
    );
  IF mismatch_count > 0 THEN
    RAISE NOTICE
      '⚠  % registrations had accom_players > 0 but no needs_hotel flags on any person. Clubs will need to re-tick hotel checkboxes.',
      mismatch_count;
  END IF;
END $$;

-- ─── 4. Приватность детей: обнулить контакты и запретить их навсегда ──
UPDATE people
  SET email = NULL, phone = NULL
  WHERE person_type = 'player';

ALTER TABLE people
  ADD CONSTRAINT people_contacts_adults_only
  CHECK (
    person_type IN ('staff', 'accompanying')
    OR (email IS NULL AND phone IS NULL)
  );

-- ─── 5. Удаляем поездочные поля с people ───────────────────
ALTER TABLE people DROP COLUMN IF EXISTS allergies;
ALTER TABLE people DROP COLUMN IF EXISTS dietary_requirements;
ALTER TABLE people DROP COLUMN IF EXISTS medical_notes;
ALTER TABLE people DROP COLUMN IF EXISTS needs_hotel;
ALTER TABLE people DROP COLUMN IF EXISTS needs_transfer;
ALTER TABLE people DROP COLUMN IF EXISTS shirt_number;
ALTER TABLE people DROP COLUMN IF EXISTS is_responsible_on_site;
-- (medical_document_url и show_publicly остаются)

-- ─── 6. Удаляем счётчики с tournament_registrations ────────
ALTER TABLE tournament_registrations DROP COLUMN IF EXISTS accom_players;
ALTER TABLE tournament_registrations DROP COLUMN IF EXISTS accom_staff;
ALTER TABLE tournament_registrations DROP COLUMN IF EXISTS accom_accompanying;

COMMIT;
