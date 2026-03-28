-- Phase 6: Add viral content extended fields and viral patterns
ALTER TABLE viral_content ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE viral_content ADD COLUMN IF NOT EXISTS creator_handle TEXT;
ALTER TABLE viral_content ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE viral_content ADD COLUMN IF NOT EXISTS post_date TIMESTAMPTZ;

ALTER TABLE analyses ADD COLUMN IF NOT EXISTS viral_patterns JSONB;
