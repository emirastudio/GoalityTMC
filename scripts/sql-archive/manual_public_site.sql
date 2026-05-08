-- Public site: add brandColor to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS brand_color VARCHAR(20) DEFAULT '#272D2D';
