-- ═══════════════════════════════════════════════════════════
-- 0037_regulations_text_and_class_docs
--
-- Регламент турнира как первоклассная фича:
--   1) Свободный текст регламента — на турнир целиком и отдельно
--      по каждому дивизиону, в 4 локалях (en/ru/et/es).
--   2) Документы — теперь могут привязываться к конкретному
--      дивизиону (class_id NULLABLE = общий документ турнира).
--      Добавлены mime_type для безопасной отдачи и name_es для
--      i18n паритета с офферингами.
--
-- Лимиты на загрузку файлов проверяются в API (30 MB на файл,
-- 100 MB суммарно на турнир) — на уровне БД ограничений нет,
-- чтобы можно было крутить лимиты без миграции.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Текст регламента — на турнир целиком ─────────────────────
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS regulations_text     text,
  ADD COLUMN IF NOT EXISTS regulations_text_ru  text,
  ADD COLUMN IF NOT EXISTS regulations_text_et  text,
  ADD COLUMN IF NOT EXISTS regulations_text_es  text;

-- ─── Текст регламента — по дивизионам ─────────────────────────
ALTER TABLE tournament_classes
  ADD COLUMN IF NOT EXISTS regulations_text     text,
  ADD COLUMN IF NOT EXISTS regulations_text_ru  text,
  ADD COLUMN IF NOT EXISTS regulations_text_et  text,
  ADD COLUMN IF NOT EXISTS regulations_text_es  text;

-- ─── Документы: привязка к дивизиону + i18n паритет ───────────
ALTER TABLE tournament_documents
  ADD COLUMN IF NOT EXISTS class_id   integer
    REFERENCES tournament_classes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name_es    text,
  ADD COLUMN IF NOT EXISTS mime_type  varchar(100);

CREATE INDEX IF NOT EXISTS tournament_documents_class_idx
  ON tournament_documents (class_id);

COMMIT;
