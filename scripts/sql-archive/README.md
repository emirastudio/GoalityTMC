# SQL archive

Historical, manually-applied SQL migrations from before the Drizzle migration
workflow was fully adopted. **All of these are already applied on production.**

Files here are kept for historical reference and emergency recovery only.
They are NOT picked up by `pnpm drizzle-kit migrate` — Drizzle reads
`src/db/migrations/meta/_journal.json`.

For new schema changes, do this instead:

```bash
# 1. Edit src/db/schema.ts
pnpm db:generate    # creates src/db/migrations/NNNN_*.sql + journal entry
pnpm db:migrate     # applies to local DB
git add src/db/migrations
```

| File | Purpose |
|---|---|
| `kings_cup_2026_import.sql` | One-time data import for the Kings Cup 2026 tournament |
| `manual_flex_services.sql` | Pre-Drizzle schema for the original flex-services model (later replaced by offerings-v3) |
| `manual_flex_services_v2.sql` | Iteration on the above |
| `manual_public_site.sql` | Added `brand_color` column to organizations |
| `migrate-listing-subscription.sql` | Added subscription columns to `listing_tournaments` |
