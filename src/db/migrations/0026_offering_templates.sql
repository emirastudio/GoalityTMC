-- ═══════════════════════════════════════════════════════════
-- 0026_offering_templates
-- Per-organization offering templates (presets)
-- Применять: psql $DATABASE_URL -f 0026_offering_templates.sql
--
-- Назначение:
--   Таблица для preset-ов услуг на уровне организации. 8 встроенных
--   шаблонов (isBuiltin=true, slug=…) сидятся отдельной API-командой
--   или при первом GET в каждой организации. Пользовательские шаблоны
--   (isBuiltin=false, slug=NULL) создаются через UI.
-- ═══════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS organization_offering_templates (
  id                    serial       PRIMARY KEY,
  organization_id       integer      NOT NULL
    REFERENCES organizations(id) ON DELETE CASCADE,
  slug                  varchar(64),
  title                 text         NOT NULL,
  title_ru              text,
  title_et              text,
  description           text,
  description_ru        text,
  description_et        text,
  icon                  varchar(16),
  kind                  offering_kind         NOT NULL DEFAULT 'single',
  inclusion             offering_inclusion    NOT NULL DEFAULT 'optional',
  price_model           offering_price_model  NOT NULL DEFAULT 'per_person',
  default_price_cents   integer      NOT NULL DEFAULT 0,
  currency              varchar(3)   NOT NULL DEFAULT 'EUR',
  nights_count          integer,
  sort_order            integer      NOT NULL DEFAULT 0,
  is_builtin            boolean      NOT NULL DEFAULT false,
  created_at            timestamp    NOT NULL DEFAULT now(),
  updated_at            timestamp    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_offering_templates_org_idx
  ON organization_offering_templates(organization_id);

-- Уникальность: одна запись на (org, slug). Позволяет несколько NULL-slug
-- (пользовательские шаблоны), но ровно один builtin с данным slug на org.
CREATE UNIQUE INDEX IF NOT EXISTS org_offering_templates_slug_unique
  ON organization_offering_templates(organization_id, slug);

COMMIT;
