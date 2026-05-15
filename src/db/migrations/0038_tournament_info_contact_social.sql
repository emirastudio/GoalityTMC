-- ═══════════════════════════════════════════════════════════
-- 0038_tournament_info_contact_social
--
-- Форма «Contact & Social» (Step 7 настройки турнира) собирала
-- contactName / contactEmail / contactPhone / website / instagram /
-- facebook / twitter / youtube, но НИ таблица tournament_info, НИ
-- API их не сохраняли — данные молча терялись, а публичная страница
-- турнира показывала только контакт организации.
--
-- Добавляем недостающие колонки. Все nullable — существующие строки
-- остаются валидными; публичная страница берёт значение турнира, а
-- при пустом — fallback на организацию.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE tournament_info
  ADD COLUMN IF NOT EXISTS contact_name   text,
  ADD COLUMN IF NOT EXISTS contact_email  text,
  ADD COLUMN IF NOT EXISTS contact_phone  text,
  ADD COLUMN IF NOT EXISTS website        text,
  ADD COLUMN IF NOT EXISTS instagram      text,
  ADD COLUMN IF NOT EXISTS facebook       text,
  ADD COLUMN IF NOT EXISTS twitter        text,
  ADD COLUMN IF NOT EXISTS youtube        text;

COMMIT;
