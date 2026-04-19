-- ═══════════════════════════════════════════════════════════
-- 0020_restore_accom_demand
-- Вернуть accom_players / accom_staff / accom_accompanying на
-- tournament_registrations. В 0018 мы их дропнули, перенеся всё на
-- пивот registration_people.needs_hotel, но для бизнес-логики нужно
-- хранить именно клубный «запрос»: «мне нужно N мест».
--
-- Логика:
--   • club на /team/overview проставляет цифры и даты → сохраняем.
--   • organiser видит запрос и назначает пакет (v3 deals).
--   • calculator при расчёте per_player/per_staff/per_accompanying
--     предпочитает accom_* если accom_confirmed=true и число > 0,
--     иначе берёт кол-во из ростера.
--
-- Применять: psql $DATABASE_URL -f 0020_restore_accom_demand.sql
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournament_registrations
  ADD COLUMN IF NOT EXISTS accom_players       integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accom_staff         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accom_accompanying  integer NOT NULL DEFAULT 0;

-- Backfill по пивоту: если клуб уже тикал галки «в отель», заполним
-- колонки теми же числами, чтобы accom quest на клубе сразу показывал
-- осмысленные цифры. Для остальных — нули (как по умолчанию).
UPDATE tournament_registrations r
SET accom_players      = COALESCE(cnt.players, 0),
    accom_staff        = COALESCE(cnt.staff, 0),
    accom_accompanying = COALESCE(cnt.accompanying, 0)
FROM (
  SELECT
    rp.registration_id AS reg_id,
    SUM(CASE WHEN p.person_type = 'player'       THEN 1 ELSE 0 END)::int AS players,
    SUM(CASE WHEN p.person_type = 'staff'        THEN 1 ELSE 0 END)::int AS staff,
    SUM(CASE WHEN p.person_type = 'accompanying' THEN 1 ELSE 0 END)::int AS accompanying
  FROM registration_people rp
  JOIN people p ON p.id = rp.person_id
  WHERE rp.needs_hotel = true
  GROUP BY rp.registration_id
) cnt
WHERE r.id = cnt.reg_id
  AND (r.accom_players + r.accom_staff + r.accom_accompanying) = 0;

COMMIT;
