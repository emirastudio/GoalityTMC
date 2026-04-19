-- ═══════════════════════════════════════════════════════════
-- 0027_offering_template_icons
-- Migrate builtin offering template icons from emoji → lucide keys
--
-- В 0026 builtin-шаблоны засевались с эмоджи-иконками (🏨, 🍽️, 🎫 и т.д.).
-- OfferingIcon рендерит не эмоджи, а lucide-icons по ключам (hotel, meal,
-- ticket, bus, car, coffee). Переводим builtin-ряды на правильные keys.
-- ═══════════════════════════════════════════════════════════

BEGIN;

UPDATE organization_offering_templates
SET icon = CASE slug
    WHEN 'hotel-by-nights'     THEN 'hotel'
    WHEN 'hotel-by-dates'      THEN 'hotel'
    WHEN 'meals-by-count'      THEN 'meal'
    WHEN 'meals-all-inclusive' THEN 'meal'
    WHEN 'extra-meal'          THEN 'coffee'
    WHEN 'tournament-card'     THEN 'ticket'
    WHEN 'transfer-full'       THEN 'bus'
    WHEN 'transfer-airport'    THEN 'car'
    ELSE icon
  END,
  updated_at = now()
WHERE is_builtin = true;

COMMIT;
