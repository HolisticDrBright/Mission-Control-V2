-- Mission Control Orchestrator Tables
-- SEO Automation + Cold Outreach + Cron Management

-- Orchestrator state (per system)
CREATE TABLE mc_orchestrator_state (
  system TEXT PRIMARY KEY, -- 'seo' | 'outreach' | 'cron'
  state_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO mc_orchestrator_state (system, state_data) VALUES
  ('seo', '{"last_trend_discovery":null,"last_keyword_research":null,"last_content_creation":null,"last_publishing":null,"articles_created_today":0,"articles_published_today":0,"max_articles_per_day":2,"topics_awaiting_research":0,"keywords_awaiting_content":0,"articles_awaiting_publishing":0,"total_articles_published":0,"daily_cost_usd":0}'),
  ('outreach', '{"last_signal_scan":null,"last_enrichment":null,"last_email_discovery":null,"last_validation":null,"last_campaign_sync":null,"signals_detected_today":0,"leads_enriched_today":0,"emails_validated_today":0,"emails_sent_today":0,"hot_leads_awaiting_action":0,"reply_queue_size":0,"daily_cost_usd":0}');

-- SEO: Trend discoveries
CREATE TABLE mc_seo_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  trend_score INTEGER NOT NULL,
  sources TEXT[] DEFAULT '{}',
  content_angle TEXT, -- tutorial | comparison | list | guide | news
  longtail_variations TEXT[] DEFAULT '{}',
  question_formats TEXT[] DEFAULT '{}',
  niche TEXT,
  status TEXT DEFAULT 'new', -- new | researched | queued | created | published
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_trends_discovered ON mc_seo_trends(discovered_at DESC);
CREATE INDEX idx_seo_trends_status ON mc_seo_trends(status);

-- SEO: Keyword research results
CREATE TABLE mc_seo_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  topic_id UUID REFERENCES mc_seo_trends(id),
  validation_score INTEGER NOT NULL DEFAULT 0,
  search_volume_proxy INTEGER DEFAULT 0,
  competition_level TEXT DEFAULT 'medium', -- low | medium | high
  allintitle_count INTEGER DEFAULT 0,
  reddit_posts INTEGER DEFAULT 0,
  reddit_engagement_avg NUMERIC(10,2) DEFAULT 0,
  content_strategy TEXT,
  content_gaps TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium', -- excellent | good | medium | skip
  status TEXT DEFAULT 'validated', -- validated | queued | in_progress | created
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_keywords_score ON mc_seo_keywords(validation_score DESC);
CREATE INDEX idx_seo_keywords_priority ON mc_seo_keywords(priority);

-- SEO: Articles
CREATE TABLE mc_seo_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  keyword TEXT NOT NULL,
  keyword_id UUID REFERENCES mc_seo_keywords(id),
  secondary_keywords TEXT[] DEFAULT '{}',
  meta_description TEXT,
  word_count INTEGER DEFAULT 0,
  seo_score INTEGER,
  status TEXT DEFAULT 'draft', -- draft | ready_for_review | published | failed_qa
  competitive_advantage TEXT,
  content_gaps_filled TEXT[] DEFAULT '{}',
  validation_score INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  wordpress_post_id TEXT,
  wordpress_url TEXT,
  published_at TIMESTAMPTZ,
  -- Performance tracking
  day2_indexed BOOLEAN,
  day7_ranking INTEGER,
  day14_traffic INTEGER,
  day30_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_articles_status ON mc_seo_articles(status);
CREATE INDEX idx_seo_articles_created ON mc_seo_articles(created_at DESC);

-- Outreach: Signals
CREATE TABLE mc_outreach_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type TEXT NOT NULL, -- hiring | tech_stack | funding | pain_point | growth | competitor | content
  signal_strength TEXT NOT NULL DEFAULT 'warm', -- hot | warm | cold
  urgency_score INTEGER DEFAULT 5,
  company_name TEXT NOT NULL,
  website TEXT,
  source TEXT,
  personalization_hooks TEXT[] DEFAULT '{}',
  recommended_approach TEXT,
  status TEXT DEFAULT 'new', -- new | enriched | contacted | converted | discarded
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_signals_detected ON mc_outreach_signals(detected_at DESC);
CREATE INDEX idx_outreach_signals_strength ON mc_outreach_signals(signal_strength);

-- Outreach: Leads
CREATE TABLE mc_outreach_leads (
  lead_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_detected TIMESTAMPTZ DEFAULT NOW(),
  signal_id UUID REFERENCES mc_outreach_signals(id),
  signal_type TEXT,
  signal_strength TEXT,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  employee_count INTEGER,
  estimated_revenue TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  contacts JSONB DEFAULT '[]', -- Array of {name, title, email, verified, linkedin}
  review_summary TEXT,
  news_summary TEXT,
  personalization_brief TEXT,
  lead_score INTEGER DEFAULT 0,
  pipeline_stage TEXT DEFAULT 'signal', -- signal | enriched | email_found | validated | campaign | replied | meeting | closed
  last_action TEXT,
  last_action_date TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT FALSE,
  email_opened BOOLEAN DEFAULT FALSE,
  email_replied BOOLEAN DEFAULT FALSE,
  reply_sentiment TEXT, -- interested | maybe_later | not_interested | referral | angry
  meeting_booked BOOLEAN DEFAULT FALSE,
  meeting_date TIMESTAMPTZ,
  deal_value NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_leads_score ON mc_outreach_leads(lead_score DESC);
CREATE INDEX idx_outreach_leads_stage ON mc_outreach_leads(pipeline_stage);
CREATE INDEX idx_outreach_leads_sentiment ON mc_outreach_leads(reply_sentiment);

-- Outreach: Campaigns
CREATE TABLE mc_outreach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT DEFAULT 'instantly',
  status TEXT DEFAULT 'draft', -- draft | active | paused | completed
  leads_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  opens INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  open_rate NUMERIC(5,2) DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0,
  positive_reply_rate NUMERIC(5,2) DEFAULT 0,
  bounce_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach: Replies
CREATE TABLE mc_outreach_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES mc_outreach_leads(lead_id),
  lead_name TEXT,
  company TEXT,
  category TEXT NOT NULL, -- interested | maybe_later | not_interested | referral | out_of_office | unsubscribe | angry
  snippet TEXT,
  actioned BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_outreach_replies_actioned ON mc_outreach_replies(actioned);
CREATE INDEX idx_outreach_replies_category ON mc_outreach_replies(category);

-- Outreach: Domain health
CREATE TABLE mc_outreach_domains (
  domain TEXT PRIMARY KEY,
  spf_valid BOOLEAN DEFAULT FALSE,
  dkim_valid BOOLEAN DEFAULT FALSE,
  dmarc_valid BOOLEAN DEFAULT FALSE,
  mx_valid BOOLEAN DEFAULT FALSE,
  blacklist_clean BOOLEAN DEFAULT TRUE,
  warmup_day INTEGER DEFAULT 0,
  daily_send_limit INTEGER DEFAULT 10,
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

-- Cost tracking
CREATE TABLE mc_cost_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  system TEXT NOT NULL, -- seo | outreach | cron
  operation TEXT NOT NULL,
  amount_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cost_log_date ON mc_cost_log(date DESC);
CREATE INDEX idx_cost_log_system ON mc_cost_log(system);

-- Alerts
CREATE TABLE mc_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system TEXT NOT NULL, -- seo | outreach | cron | budget
  severity TEXT NOT NULL DEFAULT 'info', -- critical | warning | info
  issue TEXT NOT NULL,
  action_needed TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_unacked ON mc_alerts(acknowledged) WHERE acknowledged = FALSE;
CREATE INDEX idx_alerts_timestamp ON mc_alerts(timestamp DESC);
