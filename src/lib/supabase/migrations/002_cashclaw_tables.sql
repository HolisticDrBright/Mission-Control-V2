-- CashClaw Agent Monitoring Tables
-- These mirror the Cash_Claw agent's data model for cross-monitoring in Mission Control

-- Task run log (mirrors cashclaw's task_run_log)
CREATE TABLE cashclaw_task_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  client_address TEXT NOT NULL,
  category TEXT,
  task_description TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  -- status: 'requested' | 'quoted' | 'accepted' | 'submitted' | 'revision' |
  --         'completed' | 'declined' | 'expired' | 'disputed' | 'resolved' | 'cancelled'
  quoted_price_eth NUMERIC(18,8),
  budget_eth NUMERIC(18,8),
  earned_eth NUMERIC(18,8),
  client_rating INTEGER CHECK (client_rating BETWEEN 1 AND 5),
  client_comment TEXT,
  outcome_score INTEGER CHECK (outcome_score BETWEEN 0 AND 100),
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

CREATE INDEX idx_cashclaw_runs_task ON cashclaw_task_runs(task_id);
CREATE INDEX idx_cashclaw_runs_status ON cashclaw_task_runs(status);
CREATE INDEX idx_cashclaw_runs_client ON cashclaw_task_runs(client_address);
CREATE INDEX idx_cashclaw_runs_created ON cashclaw_task_runs(created_at DESC);
CREATE INDEX idx_cashclaw_runs_category ON cashclaw_task_runs(category);

-- Client profiles (aggregated client behavior)
CREATE TABLE cashclaw_client_profiles (
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

-- Pricing history
CREATE TABLE cashclaw_pricing_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  category TEXT,
  complexity_bucket TEXT NOT NULL DEFAULT 'moderate',
  -- 'simple' | 'moderate' | 'complex' | 'expert'
  quoted_price_eth NUMERIC(18,8) NOT NULL,
  was_accepted BOOLEAN DEFAULT FALSE,
  outcome_score INTEGER,
  earned_eth NUMERIC(18,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cashclaw_pricing_created ON cashclaw_pricing_records(created_at DESC);
CREATE INDEX idx_cashclaw_pricing_category ON cashclaw_pricing_records(category);

-- Daily earnings snapshot (materialized for fast dashboard queries)
CREATE TABLE cashclaw_daily_earnings (
  date DATE PRIMARY KEY,
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

-- Negative examples for prompt improvement
CREATE TABLE cashclaw_negative_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  category TEXT,
  failure_description TEXT NOT NULL,
  failure_annotation TEXT,
  outcome_score INTEGER,
  injected_into_prompt BOOLEAN DEFAULT FALSE,
  prompt_version_injected TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
