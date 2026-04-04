// CashClaw types — mirrors the Cash_Claw agent's data model

export type CashClawTaskStatus =
  | 'requested'
  | 'quoted'
  | 'accepted'
  | 'submitted'
  | 'revision'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'disputed'
  | 'resolved'
  | 'cancelled'

export interface CashClawTask {
  id: string
  agent_id: string
  client_address: string
  task: string
  status: CashClawTaskStatus
  category: string | null
  budget_wei: string | null
  quoted_price_wei: string | null
  result: string | null
  revision_count: number
  rated_score: number | null
  rated_comment: string | null
  tx_hash: string | null
  created_at: number | null
  quoted_at: number | null
  accepted_at: number | null
  submitted_at: number | null
  completed_at: number | null
}

export interface CashClawTaskRun {
  id: string
  task_id: string
  agent_id: string
  client_address: string
  category: string | null
  task_description: string
  status: string
  quoted_price_eth: number | null
  budget_eth: number | null
  earned_eth: number | null
  client_rating: number | null
  client_comment: string | null
  outcome_score: number | null
  revision_count: number
  turns_used: number
  tokens_input: number
  tokens_output: number
  tool_calls: string[]
  prompt_version: string
  model_used: string
  agentcash_calls: number
  agentcash_cost_usdc: number
  duration_ms: number
  started_at: string
  completed_at: string
  created_at: string
}

export interface CashClawPricingRecord {
  id: string
  task_id: string
  category: string | null
  complexity_bucket: 'simple' | 'moderate' | 'complex' | 'expert'
  quoted_price_eth: number
  was_accepted: boolean
  outcome_score: number | null
  earned_eth: number | null
  created_at: string
}

export interface CashClawClientProfile {
  client_address: string
  task_count: number
  avg_rating: number | null
  total_eth_paid: number
  avg_eth_per_task: number
  ltv_score: number | null
  first_seen: string
  last_seen: string
  return_rate: number
}

export interface CashClawHeartbeatStatus {
  running: boolean
  active_tasks: number
  last_poll: number
  total_polls: number
  started_at: number
  ws_connected: boolean
  last_study_time: number
  total_study_sessions: number
  tasks_declined_by_gate: number
  dynamic_prices_used: number
  ensemble_runs_used: number
}

export interface CashClawEarningsSummary {
  total_earned_eth: number
  total_earned_usd: number
  tasks_completed: number
  tasks_declined: number
  tasks_failed: number
  avg_rating: number
  avg_outcome_score: number
  avg_earned_per_task_eth: number
  total_tokens_used: number
  total_cost_usd: number
  net_profit_eth: number
  acceptance_rate: number
  revision_rate: number
  return_client_rate: number
  top_categories: { category: string; count: number; avg_earned: number }[]
  daily_earnings: { date: string; earned_eth: number; tasks: number }[]
  hourly_activity: { hour: number; tasks: number }[]
}

export interface CashClawMLMetrics {
  bid_gate_accuracy: number
  dynamic_pricing_lift: number
  ensemble_quality_delta: number
  prompt_version: string
  negative_examples_count: number
  specialization_scores: { skill: string; score: number }[]
}

// Wei/ETH conversion helpers
export function weiToEth(wei: string | number): number {
  return Number(wei) / 1e18
}

export function ethToUsd(eth: number, ethPrice: number): number {
  return eth * ethPrice
}
