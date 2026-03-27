-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE analysis_mode AS ENUM ('quick', 'complete');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE content_platform AS ENUM ('tiktok', 'instagram', 'facebook');

-- Analyses table (root entity per D-07)
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niche_input TEXT NOT NULL,
  niche_interpreted JSONB,
  mode analysis_mode NOT NULL DEFAULT 'quick',
  status analysis_status NOT NULL DEFAULT 'pending',
  user_business_url TEXT,
  trigger_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Competitors table (per D-08)
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  website_data JSONB,
  seo_data JSONB,
  social_data JSONB,
  meta_ads_data JSONB,
  google_ads_data JSONB,
  gmb_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Viral content table (per D-09)
CREATE TABLE viral_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  platform content_platform NOT NULL,
  source_url TEXT NOT NULL,
  bunny_url TEXT,
  transcription TEXT,
  hook_body_cta JSONB,
  engagement_metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Synthesis table (per D-10)
CREATE TABLE synthesis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  strategic_overview TEXT NOT NULL,
  recommendations JSONB NOT NULL,
  creative_scripts JSONB NOT NULL,
  comparative_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(analysis_id)
);

-- Indexes for common queries
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_niche_input ON analyses(niche_input);
CREATE INDEX idx_competitors_analysis_id ON competitors(analysis_id);
CREATE INDEX idx_viral_content_analysis_id ON viral_content(analysis_id);
CREATE INDEX idx_synthesis_analysis_id ON synthesis(analysis_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Allow all access (no auth per project requirement)
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_competitors" ON competitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_viral_content" ON viral_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_synthesis" ON synthesis FOR ALL USING (true) WITH CHECK (true);
