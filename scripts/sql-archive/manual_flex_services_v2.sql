-- Migration v2: add date range, image, note fields to package_items
-- Also adds icon field to services (was already in schema but may be missing in prod)

ALTER TABLE services ADD COLUMN IF NOT EXISTS icon text;

ALTER TABLE package_items ADD COLUMN IF NOT EXISTS date_from date;
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS date_to date;
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS note_ru text;
ALTER TABLE package_items ADD COLUMN IF NOT EXISTS note_et text;
