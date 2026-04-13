-- Migration: 0009_division_schedule_config
-- Adds schedule_config JSONB column to tournament_classes for per-division scheduling settings.
-- Stores: fieldIds, days (date/startTime/endTime), matchDurationMinutes, breakBetweenMatchesMinutes, maxMatchesPerTeamPerDay

ALTER TABLE "tournament_classes"
  ADD COLUMN IF NOT EXISTS "schedule_config" JSONB;
