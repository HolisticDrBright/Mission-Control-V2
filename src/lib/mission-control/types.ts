// Mission Control Orchestrator — Unified State Types
// Mirrors ~/.mission-control/state.json structure

export interface SEOState {
  last_trend_discovery: string | null
  last_keyword_research: string | null
  last_content_creation: string | null
  last_publishing: string | null
  articles_created_today: number
  articles_published_today: number
  max_articles_per_day: number
  topics_awaiting_research: number
  keywords_awaiting_content: number
  articles_awaiting_publishing: number
  total_articles_published: number
  daily_cost_usd: number
}

export interface OutreachState {
  last_signal_scan: string | null
  last_enrichment: string | null
  last_email_discovery: string | null
  last_validation: string | null
  last_campaign_sync: string | null
  signals_detected_today: number
  leads_enriched_today: number
  emails_validated_today: number
  emails_sent_today: number
  hot_leads_awaiting_action: number
  reply_queue_size: number
  daily_cost_usd: number
}

export interface CronState {
  active_jobs: CronJob[]
  jobs_run_today: number
  last_health_check: string | null
  failed_jobs_24h: number
}

export interface SystemState {
  total_daily_budget_usd: number
  total_spent_today_usd: number
  error_count_24h: number
  consecutive_failures: number
  last_human_alert: string | null
  status: 'healthy' | 'degraded' | 'critical' | 'paused'
}

export interface MissionControlState {
  last_updated: string
  active_systems: ('seo' | 'outreach' | 'cron')[]
  seo: SEOState
  outreach: OutreachState
  cron: CronState
  system: SystemState
}

export interface CronJob {
  id: string
  name: string
  cron_expression: string
  timezone: string
  system: 'seo' | 'outreach' | 'system'
  session: 'isolated' | 'main'
  model?: string
  last_run_at: string | null
  last_run_status: 'success' | 'failed' | null
  next_run_at: string | null
  enabled: boolean
}

// SEO pipeline types
export interface TrendDiscovery {
  id: string
  discovered_at: string
  topic: string
  trend_score: number
  sources: string[]
  content_angle: 'tutorial' | 'comparison' | 'list' | 'guide' | 'news'
  longtail_variations: string[]
  question_formats: string[]
  status: 'new' | 'researched' | 'queued' | 'created' | 'published'
}

export interface KeywordResearch {
  id: string
  keyword: string
  topic_id: string
  validation_score: number
  search_volume_proxy: number
  competition_level: 'low' | 'medium' | 'high'
  allintitle_count: number
  reddit_posts: number
  content_strategy: string
  content_gaps: string[]
  priority: 'excellent' | 'good' | 'medium' | 'skip'
  status: 'validated' | 'queued' | 'in_progress' | 'created'
  created_at: string
}

export interface SEOArticle {
  id: string
  title: string
  slug: string
  keyword: string
  secondary_keywords: string[]
  meta_description: string
  word_count: number
  seo_score: number
  status: 'draft' | 'ready_for_review' | 'published' | 'failed_qa'
  competitive_advantage: string
  content_gaps_filled: string[]
  validation_score: number
  cost_usd: number
  wordpress_post_id: string | null
  wordpress_url: string | null
  published_at: string | null
  created_at: string
  // Performance tracking
  day2_indexed: boolean | null
  day7_ranking: number | null
  day14_traffic: number | null
  day30_analysis: string | null
}

// Outreach pipeline types
export interface OutreachSignal {
  id: string
  detected_at: string
  signal_type: 'hiring' | 'tech_stack' | 'funding' | 'pain_point' | 'growth' | 'competitor' | 'content'
  signal_strength: 'hot' | 'warm' | 'cold'
  urgency_score: number
  company_name: string
  website: string | null
  source: string
  personalization_hooks: string[]
  recommended_approach: string
  status: 'new' | 'enriched' | 'contacted' | 'converted' | 'discarded'
}

export interface OutreachLead {
  lead_id: string
  date_detected: string
  signal_type: string
  signal_strength: string
  company_name: string
  website: string | null
  industry: string | null
  employee_count: number | null
  estimated_revenue: string | null
  contacts: OutreachContact[]
  lead_score: number
  pipeline_stage: 'signal' | 'enriched' | 'email_found' | 'validated' | 'campaign' | 'replied' | 'meeting' | 'closed'
  personalization_brief: string | null
  email_sent: boolean
  email_opened: boolean
  email_replied: boolean
  reply_sentiment: 'interested' | 'maybe_later' | 'not_interested' | 'referral' | 'angry' | null
  meeting_booked: boolean
  meeting_date: string | null
  deal_value: number | null
}

export interface OutreachContact {
  name: string
  title: string
  email: string | null
  email_verified: boolean
  linkedin_url: string | null
  decision_authority: 'final_decision' | 'strong_influence' | 'champion' | 'gatekeeper'
}

export interface OutreachCampaign {
  id: string
  name: string
  platform: 'instantly'
  status: 'draft' | 'active' | 'paused' | 'completed'
  leads_count: number
  emails_sent: number
  opens: number
  replies: number
  meetings_booked: number
  open_rate: number
  reply_rate: number
  positive_reply_rate: number
  bounce_rate: number
  created_at: string
}

export interface OutreachReply {
  id: string
  lead_id: string
  lead_name: string
  company: string
  category: 'interested' | 'maybe_later' | 'not_interested' | 'referral' | 'out_of_office' | 'unsubscribe' | 'angry'
  snippet: string
  received_at: string
  actioned: boolean
  action_taken: string | null
}

export interface DomainHealth {
  domain: string
  spf_valid: boolean
  dkim_valid: boolean
  dmarc_valid: boolean
  mx_valid: boolean
  blacklist_clean: boolean
  warmup_day: number
  daily_send_limit: number
  last_checked: string
}

// Budget tracking
export interface BudgetBreakdown {
  seo: number
  outreach: number
  cron: number
  total: number
  remaining: number
  budget: number
  percent_used: number
}

// Alert types
export interface MissionControlAlert {
  id: string
  timestamp: string
  system: 'seo' | 'outreach' | 'cron' | 'budget'
  severity: 'critical' | 'warning' | 'info'
  issue: string
  action_needed: string
  acknowledged: boolean
}
