-- ============================================================================
-- Mission Control V2 — COMPLETE DATABASE SETUP
-- Safe to run on any Supabase instance (uses IF NOT EXISTS)
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================================

-- 1. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  root_directory TEXT,
  output_directory TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notion_page_id TEXT,
  notion_last_synced_at TIMESTAMPTZ,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT '🚀',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'custom',
  source TEXT NOT NULL DEFAULT 'openclaw',
  model TEXT DEFAULT 'claude-sonnet-4-5',
  status TEXT NOT NULL DEFAULT 'idle',
  instructions TEXT,
  capabilities TEXT[],
  skills TEXT[],
  project_id UUID REFERENCES projects(id),
  openclaw_agent_id TEXT,
  heartbeat_at TIMESTAMPTZ,
  current_task_id UUID,
  total_runs INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(12,6) DEFAULT 0,
  avg_outcome_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Skills Library
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  agent_ids UUID[],
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'build',
  project_id UUID REFERENCES projects(id),
  agent_id UUID REFERENCES agents(id),
  collaborator_agent_ids UUID[],
  kanban_status TEXT NOT NULL DEFAULT 'backlog',
  quadrant TEXT,
  priority TEXT DEFAULT 'medium',
  ai_plan TEXT,
  acceptance_criteria TEXT[],
  deliverables TEXT[],
  subtasks JSONB DEFAULT '[]',
  image_urls TEXT[],
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  depends_on_task_ids UUID[],
  blocks_task_ids UUID[],
  notion_task_id TEXT,
  notion_last_synced_at TIMESTAMPTZ,
  session_count INTEGER DEFAULT 0,
  last_session_cost_usd NUMERIC(10,6),
  total_cost_usd NUMERIC(12,6) DEFAULT 0,
  outcome_score INTEGER,
  failure_count INTEGER DEFAULT 0,
  loop_detected BOOLEAN DEFAULT FALSE,
  pipeline_id UUID,
  pipeline_position INTEGER,
  notes TEXT,
  activity_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON tasks(kanban_status);
CREATE INDEX IF NOT EXISTS idx_tasks_quadrant ON tasks(quadrant);
CREATE INDEX IF NOT EXISTS idx_tasks_pipeline ON tasks(pipeline_id);

-- 5. Scheduled Jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  agent_id UUID REFERENCES agents(id),
  job_type TEXT NOT NULL DEFAULT 'maintenance',
  cron_expression TEXT NOT NULL DEFAULT '0 * * * *',
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_output TEXT,
  run_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  prevent_overlap BOOLEAN DEFAULT TRUE,
  is_running BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inbox Messages
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'report',
  from_agent_id UUID REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'unread',
  requires_action BOOLEAN DEFAULT FALSE,
  action_options JSONB,
  action_taken TEXT,
  actioned_at TIMESTAMPTZ,
  notion_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Run History
CREATE TABLE IF NOT EXISTS run_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  agent_id UUID REFERENCES agents(id),
  project_id UUID REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  model_used TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  log_output TEXT,
  artifacts JSONB DEFAULT '[]',
  error_message TEXT,
  outcome_score INTEGER
);

-- 8. ML Ops — Agent Task Log
CREATE TABLE IF NOT EXISTS agent_task_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID,
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_name TEXT NOT NULL DEFAULT '',
  prompt_version TEXT NOT NULL DEFAULT '1.0.0',
  model_used TEXT NOT NULL DEFAULT '',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  task_type TEXT NOT NULL DEFAULT 'other',
  input_preview TEXT,
  output_preview TEXT,
  output_word_count INTEGER,
  metadata JSONB DEFAULT '{}',
  outcome_score INTEGER CHECK (outcome_score IS NULL OR (outcome_score BETWEEN 0 AND 100)),
  outcome_data JSONB,
  outcome_collected_at TIMESTAMPTZ,
  outcome_source TEXT,
  ab_test_id TEXT,
  ab_variant TEXT,
  pipeline_id UUID,
  parent_task_id UUID,
  pipeline_position INTEGER,
  pipeline_final_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_log_agent ON agent_task_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_task_log_timestamp ON agent_task_log(run_timestamp DESC);

-- 9. Prompt Version Registry
CREATE TABLE IF NOT EXISTS prompt_version_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '1.0.0',
  system_prompt TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'optimizer',
  change_log TEXT,
  change_log_detail JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  avg_score NUMERIC(5,2),
  run_count INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  approval_tier TEXT,
  approved_at TIMESTAMPTZ
);

-- 10. Pattern Analysis Log
CREATE TABLE IF NOT EXISTS pattern_analysis_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID DEFAULT gen_random_uuid(),
  analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
  agent_name TEXT NOT NULL DEFAULT '',
  records_analyzed INTEGER,
  date_range_start DATE,
  date_range_end DATE,
  avg_outcome_score NUMERIC(5,2),
  score_delta NUMERIC(5,2),
  avg_cost_per_run NUMERIC(10,6),
  cost_delta NUMERIC(10,6),
  overall_health_score INTEGER,
  optimization_warranted BOOLEAN DEFAULT FALSE,
  confidence_level TEXT,
  executive_summary TEXT,
  full_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Viral Reels
CREATE TABLE IF NOT EXISTS viral_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  brand TEXT NOT NULL DEFAULT 'custom',
  product TEXT,
  target_platform TEXT NOT NULL DEFAULT 'tiktok',
  stage TEXT NOT NULL DEFAULT 'brief',
  brief JSONB,
  generated_hooks JSONB,
  selected_hook TEXT,
  script_draft TEXT,
  script_final TEXT,
  voice_id TEXT,
  avatar_id TEXT,
  avatar_video_url TEXT,
  broll_queries JSONB,
  broll_clips JSONB,
  assembled_video_url TEXT,
  captioned_video_url TEXT,
  thumbnail_url TEXT,
  published_urls JSONB,
  published_at TIMESTAMPTZ,
  engagement_data JSONB,
  outcome_score INTEGER,
  hook_style TEXT,
  cta_type TEXT,
  duration_seconds INTEGER,
  avatar_demographic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SEO Sites
CREATE TABLE IF NOT EXISTS seo_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  niche TEXT,
  target_audience TEXT,
  brand_voice TEXT,
  notion_database_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES seo_sites(id),
  title TEXT NOT NULL DEFAULT '',
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  target_keyword TEXT,
  secondary_keywords TEXT[],
  meta_description TEXT,
  content TEXT,
  word_count INTEGER,
  seo_score INTEGER,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  notion_page_id TEXT,
  notion_last_synced_at TIMESTAMPTZ,
  assigned_agent_id UUID REFERENCES agents(id),
  estimated_traffic INTEGER,
  actual_traffic INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Keywords
CREATE TABLE IF NOT EXISTS keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES seo_sites(id),
  keyword TEXT NOT NULL DEFAULT '',
  search_volume INTEGER,
  difficulty INTEGER,
  current_rank INTEGER,
  target_rank INTEGER,
  linked_post_id UUID REFERENCES blog_posts(id),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. VA Tasks
CREATE TABLE IF NOT EXISTS va_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  attachments JSONB DEFAULT '[]',
  notes TEXT,
  notion_task_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Notion Sync Log
CREATE TABLE IF NOT EXISTS notion_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id UUID NOT NULL DEFAULT gen_random_uuid(),
  notion_id TEXT NOT NULL DEFAULT '',
  direction TEXT NOT NULL DEFAULT 'to_notion',
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id UUID,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- ============================================================================
-- CASHCLAW TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS cashclaw_task_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL DEFAULT '',
  agent_id TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  category TEXT,
  task_description TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  quoted_price_eth NUMERIC(18,8),
  budget_eth NUMERIC(18,8),
  earned_eth NUMERIC(18,8),
  client_rating INTEGER CHECK (client_rating IS NULL OR (client_rating BETWEEN 1 AND 5)),
  client_comment TEXT,
  outcome_score INTEGER CHECK (outcome_score IS NULL OR (outcome_score BETWEEN 0 AND 100)),
  revision_count INTEGER DEFAULT 0,
  turns_used INTEGER DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  tool_calls TEXT[] DEFAULT '{}',
  prompt_version TEXT,
  model_used TEXT,
  agentcash_calls INTEGER DEFAULT 0,
  agentcash_cost_usdc NUMERIC(12,6) DEFAULT 0,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashclaw_runs_status ON cashclaw_task_runs(status);
CREATE INDEX IF NOT EXISTS idx_cashclaw_runs_created ON cashclaw_task_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS cashclaw_client_profiles (
  client_address TEXT PRIMARY KEY,
  task_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2),
  total_eth_paid NUMERIC(18,8) DEFAULT 0,
  avg_eth_per_task NUMERIC(18,8) DEFAULT 0,
  ltv_score NUMERIC(5,2),
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  return_rate NUMERIC(5,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cashclaw_pricing_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL DEFAULT '',
  category TEXT,
  complexity_bucket TEXT NOT NULL DEFAULT 'moderate',
  quoted_price_eth NUMERIC(18,8) NOT NULL DEFAULT 0,
  was_accepted BOOLEAN DEFAULT FALSE,
  outcome_score INTEGER,
  earned_eth NUMERIC(18,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashclaw_daily_earnings (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  tasks_completed INTEGER DEFAULT 0,
  tasks_declined INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  total_earned_eth NUMERIC(18,8) DEFAULT 0,
  total_quoted_eth NUMERIC(18,8) DEFAULT 0,
  avg_rating NUMERIC(3,2),
  avg_outcome_score NUMERIC(5,2),
  total_tokens INTEGER DEFAULT 0,
  unique_clients INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cashclaw_negative_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL DEFAULT '',
  category TEXT,
  failure_description TEXT NOT NULL DEFAULT '',
  failure_annotation TEXT,
  outcome_score INTEGER,
  injected_into_prompt BOOLEAN DEFAULT FALSE,
  prompt_version_injected TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MISSION CONTROL ORCHESTRATOR TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS mc_orchestrator_state (
  system TEXT PRIMARY KEY,
  state_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO mc_orchestrator_state (system, state_data) VALUES
  ('seo', '{}'), ('outreach', '{}')
ON CONFLICT (system) DO NOTHING;

CREATE TABLE IF NOT EXISTS mc_seo_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL DEFAULT '',
  trend_score INTEGER NOT NULL DEFAULT 0,
  sources TEXT[] DEFAULT '{}',
  content_angle TEXT,
  longtail_variations TEXT[] DEFAULT '{}',
  question_formats TEXT[] DEFAULT '{}',
  niche TEXT,
  status TEXT DEFAULT 'new',
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_trends_discovered ON mc_seo_trends(discovered_at DESC);

CREATE TABLE IF NOT EXISTS mc_seo_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL DEFAULT '',
  topic_id UUID REFERENCES mc_seo_trends(id),
  validation_score INTEGER NOT NULL DEFAULT 0,
  search_volume_proxy INTEGER DEFAULT 0,
  competition_level TEXT DEFAULT 'medium',
  allintitle_count INTEGER DEFAULT 0,
  reddit_posts INTEGER DEFAULT 0,
  reddit_engagement_avg NUMERIC(10,2) DEFAULT 0,
  content_strategy TEXT,
  content_gaps TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'validated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_score ON mc_seo_keywords(validation_score DESC);

CREATE TABLE IF NOT EXISTS mc_seo_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT,
  keyword TEXT NOT NULL DEFAULT '',
  keyword_id UUID REFERENCES mc_seo_keywords(id),
  secondary_keywords TEXT[] DEFAULT '{}',
  meta_description TEXT,
  word_count INTEGER DEFAULT 0,
  seo_score INTEGER,
  status TEXT DEFAULT 'draft',
  competitive_advantage TEXT,
  content_gaps_filled TEXT[] DEFAULT '{}',
  validation_score INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  wordpress_post_id TEXT,
  wordpress_url TEXT,
  published_at TIMESTAMPTZ,
  day2_indexed BOOLEAN,
  day7_ranking INTEGER,
  day14_traffic INTEGER,
  day30_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_articles_status ON mc_seo_articles(status);

CREATE TABLE IF NOT EXISTS mc_outreach_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type TEXT NOT NULL DEFAULT 'pain_point',
  signal_strength TEXT NOT NULL DEFAULT 'warm',
  urgency_score INTEGER DEFAULT 5,
  company_name TEXT NOT NULL DEFAULT '',
  website TEXT,
  source TEXT,
  personalization_hooks TEXT[] DEFAULT '{}',
  recommended_approach TEXT,
  status TEXT DEFAULT 'new',
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_signals_detected ON mc_outreach_signals(detected_at DESC);

CREATE TABLE IF NOT EXISTS mc_outreach_leads (
  lead_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_detected TIMESTAMPTZ DEFAULT NOW(),
  signal_id UUID REFERENCES mc_outreach_signals(id),
  signal_type TEXT,
  signal_strength TEXT,
  company_name TEXT NOT NULL DEFAULT '',
  website TEXT,
  industry TEXT,
  employee_count INTEGER,
  estimated_revenue TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  contacts JSONB DEFAULT '[]',
  review_summary TEXT,
  news_summary TEXT,
  personalization_brief TEXT,
  lead_score INTEGER DEFAULT 0,
  pipeline_stage TEXT DEFAULT 'signal',
  last_action TEXT,
  last_action_date TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT FALSE,
  email_opened BOOLEAN DEFAULT FALSE,
  email_replied BOOLEAN DEFAULT FALSE,
  reply_sentiment TEXT,
  meeting_booked BOOLEAN DEFAULT FALSE,
  meeting_date TIMESTAMPTZ,
  deal_value NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_leads_score ON mc_outreach_leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_leads_stage ON mc_outreach_leads(pipeline_stage);

CREATE TABLE IF NOT EXISTS mc_outreach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  platform TEXT DEFAULT 'instantly',
  status TEXT DEFAULT 'draft',
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

CREATE TABLE IF NOT EXISTS mc_outreach_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES mc_outreach_leads(lead_id),
  lead_name TEXT,
  company TEXT,
  category TEXT NOT NULL DEFAULT 'not_interested',
  snippet TEXT,
  actioned BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_replies_actioned ON mc_outreach_replies(actioned);

CREATE TABLE IF NOT EXISTS mc_outreach_domains (
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

CREATE TABLE IF NOT EXISTS mc_cost_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  system TEXT NOT NULL DEFAULT 'seo',
  operation TEXT NOT NULL DEFAULT '',
  amount_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_log_date ON mc_cost_log(date DESC);

CREATE TABLE IF NOT EXISTS mc_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system TEXT NOT NULL DEFAULT 'seo',
  severity TEXT NOT NULL DEFAULT 'info',
  issue TEXT NOT NULL DEFAULT '',
  action_needed TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_unacked ON mc_alerts(acknowledged) WHERE acknowledged = FALSE;

-- Outreach Templates + Sequences
CREATE TABLE IF NOT EXISTS mc_outreach_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'cold_email',
  subject TEXT,
  body TEXT NOT NULL DEFAULT '',
  notes TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mc_outreach_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT DEFAULT 'draft',
  steps JSONB DEFAULT '[]',
  active_leads_count INTEGER DEFAULT 0,
  total_enrolled INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DONE! All 29 tables created with full schemas.
-- ============================================================================
