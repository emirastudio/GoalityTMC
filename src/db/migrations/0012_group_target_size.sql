-- Add target_size to stage_groups: stores intended team-slot count for slot-mode scheduling.
-- NULL means "use actual assigned teams" (legacy behaviour).
-- When set, fixture generator creates matches for target_size slots even if fewer teams are assigned.
ALTER TABLE stage_groups ADD COLUMN target_size integer;
