-- ═══════════════════════════════════════════════════════════
-- 0021_auto_assign_package
-- Auto-assign v3 package on accom confirm.
--
-- Когда клуб подтверждает accommodation, организатору лень руками
-- назначать каждому клубу один и тот же пакет. Выбираем «дефолтный»
-- offering (kind=package) на уровне турнира — и при accomConfirmed=true
-- бэкенд сам создаёт published teamOfferingDeals(reg, offering).
-- NULL = ручной режим, как раньше.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS auto_assign_package_offering_id integer
  REFERENCES offerings(id) ON DELETE SET NULL;

COMMIT;
