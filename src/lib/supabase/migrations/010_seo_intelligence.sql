-- SEO Intelligence: daily snapshots for tracking progress
CREATE TABLE IF NOT EXISTS mc_seo_daily_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  site TEXT NOT NULL DEFAULT 'all',
  grade TEXT,
  grade_score INTEGER,
  total_clicks INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  avg_ctr NUMERIC(6,2) DEFAULT 0,
  avg_position NUMERIC(6,2) DEFAULT 0,
  total_queries INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  -- Opportunities detected
  striking_distance_keywords INTEGER DEFAULT 0,  -- position 11-30
  high_impression_low_click INTEGER DEFAULT 0,    -- >100 impressions, <2% CTR
  content_recommendations JSONB DEFAULT '[]',
  -- Week-over-week changes
  clicks_wow_change NUMERIC(6,2),
  impressions_wow_change NUMERIC(6,2),
  position_wow_change NUMERIC(6,2),
  ctr_wow_change NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, site)
);

CREATE INDEX IF NOT EXISTS idx_seo_snapshots_date ON mc_seo_daily_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_snapshots_site ON mc_seo_daily_snapshots(site, date DESC);
