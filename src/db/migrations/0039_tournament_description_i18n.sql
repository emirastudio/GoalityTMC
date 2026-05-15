-- Add multilang description columns to tournaments table
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS description_ru text,
  ADD COLUMN IF NOT EXISTS description_et text,
  ADD COLUMN IF NOT EXISTS description_es text;
