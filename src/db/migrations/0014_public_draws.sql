-- Storage for anonymous standalone /draw share-links. The wizard
-- writes the full draw state here under a short 6-char id so share
-- URLs stay compact (/draw/s/abc123) instead of base64-encoding the
-- whole team list into the query string.
CREATE TABLE IF NOT EXISTS public_draws (
  id         text        PRIMARY KEY,
  state      jsonb       NOT NULL,
  created_at timestamp   NOT NULL DEFAULT NOW(),
  view_count integer     NOT NULL DEFAULT 0
);

-- For a possible future TTL cleanup job.
CREATE INDEX IF NOT EXISTS idx_public_draws_created_at ON public_draws(created_at);
