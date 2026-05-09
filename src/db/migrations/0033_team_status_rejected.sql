-- ═══════════════════════════════════════════════════════════
-- 0033_team_status_rejected
-- Add 'rejected' to team_status enum.
-- Semantics:
--   draft     — internal scratch (rare)
--   open      — заявка подана, ждёт ответа организатора
--   confirmed — организатор подтвердил
--   rejected  — организатор отказал (с причиной в notes)
--   cancelled — клуб отозвал свою заявку
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TYPE team_status ADD VALUE IF NOT EXISTS 'rejected';

COMMIT;
