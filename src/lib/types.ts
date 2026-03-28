// ============================================================================
// Mission Control V2 - TypeScript Types
// Matches Supabase schema definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Enum / Union Types
// ---------------------------------------------------------------------------

export type ProjectType = 'app_dev' | 'seo' | 'ugc' | 'general' | 'va';
export type ProjectStatus = 'active' | 'paused' | 'archived';

export type AgentRole = 'developer' | 'researcher' | 'marketer' | 'analyst' | 'content' | 'va' | 'custom';
export type AgentSource = 'openclaw' | 'cowork' | 'custom';
export type AgentStatus = 'idle' | 'running' | 'standby' | 'error' | 'offline';

export type TaskType = 'plan' | 'build' | 'ops' | 'research' | 'content' | 'va';
export type KanbanStatus = 'backlog' | 'planned' | 'in_progress' | 'blocked' | 'review' | 'testing' | 'done';
export type Quadrant = 'do' | 'schedule' | 'delegate' | 'eliminate';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type ScheduledJobType = 'reporting' | 'monitoring' | 'content' | 'outreach' | 'maintenance' | 'ml_ops';

export type InboxMessageType = 'delegation' | 'report' | 'question' | 'approval_request' | 'failure_report';
export type InboxMessageStatus = 'unread' | 'read' | 'actioned' | 'dismissed';

export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_deployed';

export type ViralReelBrand = 'holistic_dr_bright' | 'dspiked' | 'custom';
export type ViralReelStage =
  | 'brief'
  | 'hook_generation'
  | 'hook_selection'
  | 'script_draft'
  | 'script_final'
  | 'voice_generation'
  | 'avatar_video'
  | 'broll_sourcing'
  | 'assembly'
  | 'captioning'
  | 'thumbnail'
  | 'review'
  | 'published';

export type BlogPostStatus = 'draft' | 'outline' | 'writing' | 'editing' | 'review' | 'scheduled' | 'published';

export type VATaskStatus = 'pending' | 'in_progress' | 'waiting_on_you' | 'review' | 'done';

export type NotionSyncDirection = 'to_notion' | 'from_notion';
export type NotionSyncStatus = 'success' | 'failed' | 'skipped';

// ---------------------------------------------------------------------------
// Kanban column ordering
// ---------------------------------------------------------------------------

export const KANBAN_COLUMNS: KanbanStatus[] = [
  'backlog',
  'planned',
  'in_progress',
  'blocked',
  'review',
  'testing',
  'done',
];

export const KANBAN_COLUMN_LABELS: Record<KanbanStatus, string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  review: 'Review',
  testing: 'Testing',
  done: 'Done',
};

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  do: 'Do First',
  schedule: 'Schedule',
  delegate: 'Delegate',
  eliminate: 'Eliminate',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const VIRAL_REEL_STAGES: ViralReelStage[] = [
  'brief',
  'hook_generation',
  'hook_selection',
  'script_draft',
  'script_final',
  'voice_generation',
  'avatar_video',
  'broll_sourcing',
  'assembly',
  'captioning',
  'thumbnail',
  'review',
  'published',
];

// ---------------------------------------------------------------------------
// Entity Types
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ProjectType;
  root_directory: string | null;
  output_directory: string | null;
  status: ProjectStatus;
  notion_page_id: string | null;
  notion_last_synced_at: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  source: AgentSource;
  model: string | null;
  status: AgentStatus;
  instructions: string | null;
  capabilities: string[] | null;
  skills: string[] | null;
  project_id: string | null;
  openclaw_agent_id: string | null;
  heartbeat_at: string | null;
  current_task_id: string | null;
  total_runs: number;
  total_cost_usd: number;
  avg_outcome_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string | null;
  content: string;
  agent_ids: string[];
  category: string | null;
  usage_count: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  project_id: string | null;
  agent_id: string | null;
  collaborator_agent_ids: string[] | null;
  kanban_status: KanbanStatus;
  quadrant: Quadrant | null;
  priority: Priority;
  ai_plan: string | null;
  acceptance_criteria: string[] | null;
  deliverables: string[] | null;
  subtasks: Subtask[] | null;
  image_urls: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  depends_on_task_ids: string[] | null;
  blocks_task_ids: string[] | null;
  notion_task_id: string | null;
  notion_last_synced_at: string | null;
  session_count: number;
  last_session_cost_usd: number | null;
  total_cost_usd: number;
  outcome_score: number | null;
  failure_count: number;
  loop_detected: boolean;
  pipeline_id: string | null;
  pipeline_position: number | null;
  notes: string | null;
  activity_log: TaskActivityEntry[] | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskActivityEntry {
  timestamp: string;
  event: string;
  details: string | null;
}

export interface ScheduledJob {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  agent_id: string | null;
  job_type: ScheduledJobType;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_run_status: string | null;
  last_run_output: string | null;
  run_count: number;
  fail_count: number;
  prevent_overlap: boolean;
  is_running: boolean;
  created_at: string;
}

export interface InboxMessage {
  id: string;
  type: InboxMessageType;
  from_agent_id: string | null;
  task_id: string | null;
  subject: string;
  body: string;
  status: InboxMessageStatus;
  requires_action: boolean;
  action_options: Array<{ label: string; value: string }> | null;
  action_taken: string | null;
  actioned_at: string | null;
  notion_synced: boolean;
  created_at: string;
}

export interface RunHistory {
  id: string;
  task_id: string | null;
  agent_id: string | null;
  project_id: string | null;
  status: RunStatus;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  log_output: string | null;
  artifacts: Record<string, unknown> | null;
  error_message: string | null;
  outcome_score: number | null;
}

export interface AgentTaskLog {
  id: string;
  task_id: string | null;
  run_timestamp: string;
  agent_name: string;
  prompt_version: string | null;
  model_used: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  execution_time_ms: number;
  task_type: string | null;
  input_preview: string | null;
  output_preview: string | null;
  output_word_count: number | null;
  metadata: Record<string, unknown> | null;
  outcome_score: number | null;
  outcome_data: Record<string, unknown> | null;
  outcome_collected_at: string | null;
  outcome_source: string | null;
  ab_test_id: string | null;
  ab_variant: string | null;
  pipeline_id: string | null;
  parent_task_id: string | null;
  pipeline_position: number | null;
  pipeline_final_score: number | null;
  created_at: string;
}

export interface PromptVersionRegistry {
  id: string;
  agent_name: string;
  version: string;
  system_prompt: string;
  created_at: string;
  created_by: string | null;
  change_log: string | null;
  change_log_detail: string | null;
  is_active: boolean;
  avg_score: number | null;
  run_count: number;
  approval_status: ApprovalStatus;
  approval_tier: number | null;
  approved_at: string | null;
}

export interface PatternAnalysisLog {
  id: string;
  analysis_id: string;
  analysis_timestamp: string;
  agent_name: string;
  records_analyzed: number;
  date_range_start: string;
  date_range_end: string;
  avg_outcome_score: number | null;
  score_delta: number | null;
  avg_cost_per_run: number | null;
  cost_delta: number | null;
  overall_health_score: number | null;
  optimization_warranted: boolean;
  confidence_level: number | null;
  executive_summary: string | null;
  full_report: string | null;
  created_at: string;
}

export interface ViralReel {
  id: string;
  title: string;
  brand: ViralReelBrand;
  product: string | null;
  target_platform: string | null;
  stage: ViralReelStage;
  brief: string | null;
  generated_hooks: string[] | null;
  selected_hook: string | null;
  script_draft: string | null;
  script_final: string | null;
  voice_id: string | null;
  avatar_id: string | null;
  avatar_video_url: string | null;
  broll_queries: string[] | null;
  broll_clips: string[] | null;
  assembled_video_url: string | null;
  captioned_video_url: string | null;
  thumbnail_url: string | null;
  published_urls: string[] | null;
  published_at: string | null;
  engagement_data: Record<string, unknown> | null;
  outcome_score: number | null;
  hook_style: string | null;
  cta_type: string | null;
  duration_seconds: number | null;
  avatar_demographic: string | null;
  created_at: string;
  updated_at: string;
}

export interface SEOSite {
  id: string;
  name: string;
  domain: string;
  niche: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  notion_database_id: string | null;
  created_at: string;
}

export interface BlogPost {
  id: string;
  site_id: string;
  title: string;
  slug: string;
  status: BlogPostStatus;
  target_keyword: string | null;
  secondary_keywords: string[] | null;
  meta_description: string | null;
  content: string | null;
  word_count: number | null;
  seo_score: number | null;
  published_url: string | null;
  published_at: string | null;
  notion_page_id: string | null;
  notion_last_synced_at: string | null;
  assigned_agent_id: string | null;
  estimated_traffic: number | null;
  actual_traffic: number | null;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  site_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  current_rank: number | null;
  target_rank: number | null;
  linked_post_id: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface VATask {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  assigned_to: string | null;
  priority: Priority;
  status: VATaskStatus;
  due_date: string | null;
  recurring: boolean;
  recurrence_rule: string | null;
  attachments: string[] | null;
  notes: string | null;
  notion_task_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotionSyncLog {
  id: string;
  entity_type: string;
  entity_id: string;
  notion_id: string;
  direction: NotionSyncDirection;
  status: NotionSyncStatus;
  error_message: string | null;
  synced_at: string;
}

export interface ActivityLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Daemon / System Status
// ---------------------------------------------------------------------------

export interface DaemonStatus {
  daemon_id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime_seconds: number;
  last_heartbeat_at: string;
  active_jobs: number;
  queued_jobs: number;
  memory_usage_mb: number;
  cpu_percent: number;
  version: string;
  started_at: string;
  error_message: string | null;
}

// ---------------------------------------------------------------------------
// Utility / Derived Types
// ---------------------------------------------------------------------------

export type ProjectCreateInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
export type ProjectUpdateInput = Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;

export type AgentCreateInput = Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'total_runs' | 'total_cost_usd'>;
export type AgentUpdateInput = Partial<Omit<Agent, 'id' | 'created_at' | 'updated_at'>>;

export type TaskCreateInput = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'session_count' | 'total_cost_usd' | 'failure_count' | 'loop_detected'>;
export type TaskUpdateInput = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;

export type InboxMessageCreateInput = Omit<InboxMessage, 'id' | 'created_at' | 'status' | 'action_taken' | 'actioned_at' | 'notion_synced'>;
export type ScheduledJobCreateInput = Omit<ScheduledJob, 'id' | 'created_at' | 'run_count' | 'fail_count' | 'is_running'>;

export type ViralReelCreateInput = Omit<ViralReel, 'id' | 'created_at' | 'updated_at'>;
export type ViralReelUpdateInput = Partial<Omit<ViralReel, 'id' | 'created_at' | 'updated_at'>>;

export type BlogPostCreateInput = Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;
export type BlogPostUpdateInput = Partial<Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>>;

export type VATaskCreateInput = Omit<VATask, 'id' | 'created_at' | 'updated_at'>;
export type VATaskUpdateInput = Partial<Omit<VATask, 'id' | 'created_at' | 'updated_at'>>;
