-- ═══════════════════════════════════════════════════════════
-- 0019_deal_free_slots
-- Free slots + meals override on team_offering_deals (offerings v3).
-- Применять: psql $DATABASE_URL -f 0019_deal_free_slots.sql
--
-- Назначение:
--   Дать организатору возможность «подарить» команде N бесплатных
--   слотов внутри пакета (players/staff/accompanying) и, опционально,
--   задать кастомное число приёмов пищи.
--
-- Backfill: если у регистрации есть legacy package_assignments с
-- ненулевыми free_*-колонками — переносим их в v3-сделку.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE team_offering_deals
  ADD COLUMN IF NOT EXISTS free_players_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_staff_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_accompanying_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meals_count_override integer;

-- Backfill из legacy package_assignments (для команд, у которых
-- параллельно жили v1 и v3). Берём максимум подарков — иначе данные
-- не сходятся по определению, но нам нужна одна цифра.
UPDATE team_offering_deals td
SET free_players_count       = GREATEST(td.free_players_count, pa.free_players_count),
    free_staff_count         = GREATEST(td.free_staff_count, pa.free_staff_count),
    free_accompanying_count  = GREATEST(td.free_accompanying_count, pa.free_accompanying_count),
    meals_count_override     = COALESCE(td.meals_count_override, pa.meals_count_override)
FROM package_assignments pa
WHERE pa.registration_id = td.registration_id
  AND (pa.free_players_count + pa.free_staff_count + pa.free_accompanying_count > 0
       OR pa.meals_count_override IS NOT NULL);

COMMIT;
