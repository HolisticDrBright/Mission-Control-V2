-- Mission Control V2 — Initial Schema
-- Run all of these in the Supabase SQL editor in order.

-- 1. Projects
CREATE TABLE projects (
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
CREATE TABLE agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
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
CREATE TABLE skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  agent_ids UUID[],
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks
CREATE TABLE tasks (
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

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_kanban ON tasks(kanban_status);
CREATE INDEX idx_tasks_quadrant ON tasks(quadrant);
CREATE INDEX idx_tasks_pipeline ON tasks(pipeline_id);

-- 5. Scheduler / Cron Jobs
CREATE TABLE scheduled_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  agent_id UUID REFERENCES agents(id),
  job_type TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
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

-- 6. Inbox
CREATE TABLE inbox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  from_agent_id UUID REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  requires_action BOOLEAN DEFAULT FALSE,
  action_options JSONB,
  action_taken TEXT,
  actioned_at TIMESTAMPTZ,
  notion_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Run History
CREATE TABLE run_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  agent_id UUID REFERENCES agents(id),
  project_id UUID REFERENCES projects(id),
  status TEXT NOT NULL,
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
CREATE TABLE agent_task_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL UNIQUE,
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  task_type TEXT NOT NULL DEFAULT 'other',
  input_preview TEXT,
  output_preview TEXT,
  output_word_count INTEGER,
  metadata JSONB DEFAULT '{}',
  outcome_score INTEGER CHECK (outcome_score BETWEEN 0 AND 100),
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

CREATE INDEX idx_task_log_agent ON agent_task_log(agent_name);
CREATE INDEX idx_task_log_timestamp ON agent_task_log(run_timestamp DESC);
CREATE INDEX idx_task_log_version ON agent_task_log(prompt_version);
CREATE INDEX idx_task_log_score ON agent_task_log(outcome_score);
CREATE INDEX idx_task_log_unscored ON agent_task_log(outcome_score) WHERE outcome_score IS NULL;

-- 9. ML Ops — Prompt Version Registry
CREATE TABLE prompt_version_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  version TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'optimizer',
  change_log TEXT,
  change_log_detail JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  avg_score NUMERIC(5,2),
  run_count INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  approval_tier TEXT,
  approved_at TIMESTAMPTZ,
  UNIQUE(agent_name, version)
);

-- 10. ML Ops — Pattern Analysis Log
CREATE TABLE pattern_analysis_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL UNIQUE,
  analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
  agent_name TEXT NOT NULL,
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

-- 11. Viral Reel Pipeline
CREATE TABLE viral_reels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  brand TEXT NOT NULL,
  product TEXT,
  target_platform TEXT NOT NULL DEFAULT 'tiktok',
  stage TEXT NOT NULL DEFAULT 'genviral_input',
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

-- 12. SEO
CREATE TABLE seo_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  niche TEXT,
  target_audience TEXT,
  brand_voice TEXT,
  notion_database_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES seo_sites(id),
  title TEXT NOT NULL,
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

CREATE TABLE keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES seo_sites(id),
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  difficulty INTEGER,
  current_rank INTEGER,
  target_rank INTEGER,
  linked_post_id UUID REFERENCES blog_posts(id),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. VA Tasks
CREATE TABLE va_tasks (
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

-- 14. Notion Sync Log
CREATE TABLE notion_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  notion_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Activity Log
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
