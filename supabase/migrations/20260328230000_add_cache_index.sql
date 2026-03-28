-- Composite expression index for cache-match query on niche_interpreted JSONB fields
-- Supports findCachedAnalysis() query: ILIKE on niche/segment/region + status + mode + created_at
CREATE INDEX IF NOT EXISTS idx_analyses_cache_match
ON analyses (
  lower(niche_interpreted->>'niche'),
  lower(niche_interpreted->>'segment'),
  lower(niche_interpreted->>'region'),
  mode,
  status,
  created_at DESC
);
