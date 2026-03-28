// ============================================================================
// Mission Control V2 - Zod Validation Schemas
// Mirrors types.ts for runtime API validation
// ============================================================================

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enum Schemas
// ---------------------------------------------------------------------------

export const ProjectTypeSchema = z.enum([
  "app_dev",
  "seo",
  "ugc",
  "general",
  "va",
]);

export const ProjectStatusSchema = z.enum(["active", "paused", "archived"]);

export const AgentRoleSchema = z.enum([
  "developer",
  "researcher",
  "marketer",
  "analyst",
  "content",
  "va",
  "custom",
]);

export const AgentSourceSchema = z.enum(["openclaw", "cowork", "custom"]);

export const AgentStatusSchema = z.enum([
  "idle",
  "running",
  "standby",
  "error",
  "offline",
]);

export const TaskTypeSchema = z.enum([
  "plan",
  "build",
  "ops",
  "research",
  "content",
  "va",
]);

export const KanbanStatusSchema = z.enum([
  "backlog",
  "planned",
  "in_progress",
  "blocked",
  "review",
  "testing",
  "done",
]);

export const QuadrantSchema = z.enum([
  "do",
  "schedule",
  "delegate",
  "eliminate",
]);

export const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export const ScheduledJobTypeSchema = z.enum([
  "reporting",
  "monitoring",
  "content",
  "outreach",
  "maintenance",
  "ml_ops",
]);

export const InboxMessageTypeSchema = z.enum([
  "delegation",
  "report",
  "question",
  "approval_request",
  "failure_report",
]);

export const InboxMessageStatusSchema = z.enum([
  "unread",
  "read",
  "actioned",
  "dismissed",
]);

export const RunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const ApprovalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "auto_deployed",
]);

export const ViralReelBrandSchema = z.enum([
  "holistic_dr_bright",
  "dspiked",
  "custom",
]);

export const ViralReelStageSchema = z.enum([
  "brief",
  "hook_generation",
  "hook_selection",
  "script_draft",
  "script_final",
  "voice_generation",
  "avatar_video",
  "broll_sourcing",
  "assembly",
  "captioning",
  "thumbnail",
  "review",
  "published",
]);

export const BlogPostStatusSchema = z.enum([
  "draft",
  "outline",
  "writing",
  "editing",
  "review",
  "scheduled",
  "published",
]);

export const VATaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "waiting_on_you",
  "review",
  "done",
]);

export const NotionSyncDirectionSchema = z.enum(["to_notion", "from_notion"]);
export const NotionSyncStatusSchema = z.enum(["success", "failed", "skipped"]);

// ---------------------------------------------------------------------------
// Embedded Object Schemas
// ---------------------------------------------------------------------------

export const SubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

export const TaskActivityEntrySchema = z.object({
  timestamp: z.string(),
  event: z.string(),
  details: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Entity Schemas (full row shape, including id + timestamps)
// ---------------------------------------------------------------------------

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  type: ProjectTypeSchema,
  root_directory: z.string().nullable(),
  output_directory: z.string().nullable(),
  status: ProjectStatusSchema,
  notion_page_id: z.string().nullable(),
  notion_last_synced_at: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const AgentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: AgentRoleSchema,
  source: AgentSourceSchema,
  model: z.string().nullable(),
  status: AgentStatusSchema,
  instructions: z.string().nullable(),
  capabilities: z.array(z.string()).nullable(),
  skills: z.array(z.string()).nullable(),
  project_id: z.string().uuid().nullable(),
  openclaw_agent_id: z.string().nullable(),
  heartbeat_at: z.string().nullable(),
  current_task_id: z.string().uuid().nullable(),
  total_runs: z.number().int().min(0),
  total_cost_usd: z.number().min(0),
  avg_outcome_score: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const SkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  content: z.string(),
  agent_ids: z.array(z.string().uuid()),
  category: z.string().nullable(),
  usage_count: z.number().int().min(0),
  created_at: z.string(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  type: TaskTypeSchema,
  project_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  collaborator_agent_ids: z.array(z.string().uuid()).nullable(),
  kanban_status: KanbanStatusSchema,
  quadrant: QuadrantSchema.nullable(),
  priority: PrioritySchema,
  ai_plan: z.string().nullable(),
  acceptance_criteria: z.array(z.string()).nullable(),
  deliverables: z.array(z.string()).nullable(),
  subtasks: z.array(SubtaskSchema).nullable(),
  image_urls: z.array(z.string().url()).nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  estimated_minutes: z.number().int().min(0).nullable(),
  actual_minutes: z.number().int().min(0).nullable(),
  depends_on_task_ids: z.array(z.string().uuid()).nullable(),
  blocks_task_ids: z.array(z.string().uuid()).nullable(),
  notion_task_id: z.string().nullable(),
  notion_last_synced_at: z.string().nullable(),
  session_count: z.number().int().min(0),
  last_session_cost_usd: z.number().min(0).nullable(),
  total_cost_usd: z.number().min(0),
  outcome_score: z.number().nullable(),
  failure_count: z.number().int().min(0),
  loop_detected: z.boolean(),
  pipeline_id: z.string().nullable(),
  pipeline_position: z.number().int().nullable(),
  notes: z.string().nullable(),
  activity_log: z.array(TaskActivityEntrySchema).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ScheduledJobSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  project_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  job_type: ScheduledJobTypeSchema,
  cron_expression: z.string().min(1),
  enabled: z.boolean(),
  last_run_at: z.string().nullable(),
  next_run_at: z.string().nullable(),
  last_run_status: z.string().nullable(),
  last_run_output: z.string().nullable(),
  run_count: z.number().int().min(0),
  fail_count: z.number().int().min(0),
  prevent_overlap: z.boolean(),
  is_running: z.boolean(),
  created_at: z.string(),
});

export const InboxMessageSchema = z.object({
  id: z.string().uuid(),
  type: InboxMessageTypeSchema,
  from_agent_id: z.string().uuid().nullable(),
  task_id: z.string().uuid().nullable(),
  subject: z.string().min(1),
  body: z.string(),
  status: InboxMessageStatusSchema,
  requires_action: z.boolean(),
  action_options: z.array(z.object({ label: z.string(), value: z.string() })).nullable(),
  action_taken: z.string().nullable(),
  actioned_at: z.string().nullable(),
  notion_synced: z.boolean(),
  created_at: z.string(),
});

export const RunHistorySchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid().nullable(),
  agent_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  status: RunStatusSchema,
  started_at: z.string(),
  ended_at: z.string().nullable(),
  duration_ms: z.number().int().min(0).nullable(),
  model_used: z.string().nullable(),
  input_tokens: z.number().int().min(0).nullable(),
  output_tokens: z.number().int().min(0).nullable(),
  cost_usd: z.number().min(0).nullable(),
  log_output: z.string().nullable(),
  artifacts: z.record(z.string(), z.unknown()).nullable(),
  error_message: z.string().nullable(),
  outcome_score: z.number().nullable(),
});

export const AgentTaskLogSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid().nullable(),
  run_timestamp: z.string(),
  agent_name: z.string().min(1),
  prompt_version: z.string().nullable(),
  model_used: z.string().min(1),
  input_tokens: z.number().int().min(0),
  output_tokens: z.number().int().min(0),
  cost_usd: z.number().min(0),
  execution_time_ms: z.number().int().min(0),
  task_type: z.string().nullable(),
  input_preview: z.string().nullable(),
  output_preview: z.string().nullable(),
  output_word_count: z.number().int().min(0).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  outcome_score: z.number().nullable(),
  outcome_data: z.record(z.string(), z.unknown()).nullable(),
  outcome_collected_at: z.string().nullable(),
  outcome_source: z.string().nullable(),
  ab_test_id: z.string().nullable(),
  ab_variant: z.string().nullable(),
  pipeline_id: z.string().nullable(),
  parent_task_id: z.string().uuid().nullable(),
  pipeline_position: z.number().int().nullable(),
  pipeline_final_score: z.number().nullable(),
  created_at: z.string(),
});

export const PromptVersionRegistrySchema = z.object({
  id: z.string().uuid(),
  agent_name: z.string().min(1),
  version: z.string().min(1),
  system_prompt: z.string(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  change_log: z.string().nullable(),
  change_log_detail: z.string().nullable(),
  is_active: z.boolean(),
  avg_score: z.number().nullable(),
  run_count: z.number().int().min(0),
  approval_status: ApprovalStatusSchema,
  approval_tier: z.number().int().nullable(),
  approved_at: z.string().nullable(),
});

export const PatternAnalysisLogSchema = z.object({
  id: z.string().uuid(),
  analysis_id: z.string(),
  analysis_timestamp: z.string(),
  agent_name: z.string().min(1),
  records_analyzed: z.number().int().min(0),
  date_range_start: z.string(),
  date_range_end: z.string(),
  avg_outcome_score: z.number().nullable(),
  score_delta: z.number().nullable(),
  avg_cost_per_run: z.number().nullable(),
  cost_delta: z.number().nullable(),
  overall_health_score: z.number().nullable(),
  optimization_warranted: z.boolean(),
  confidence_level: z.number().nullable(),
  executive_summary: z.string().nullable(),
  full_report: z.string().nullable(),
  created_at: z.string(),
});

export const ViralReelSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  brand: ViralReelBrandSchema,
  product: z.string().nullable(),
  target_platform: z.string().nullable(),
  stage: ViralReelStageSchema,
  brief: z.string().nullable(),
  generated_hooks: z.array(z.string()).nullable(),
  selected_hook: z.string().nullable(),
  script_draft: z.string().nullable(),
  script_final: z.string().nullable(),
  voice_id: z.string().nullable(),
  avatar_id: z.string().nullable(),
  avatar_video_url: z.string().url().nullable(),
  broll_queries: z.array(z.string()).nullable(),
  broll_clips: z.array(z.string()).nullable(),
  assembled_video_url: z.string().url().nullable(),
  captioned_video_url: z.string().url().nullable(),
  thumbnail_url: z.string().url().nullable(),
  published_urls: z.array(z.string().url()).nullable(),
  published_at: z.string().nullable(),
  engagement_data: z.record(z.string(), z.unknown()).nullable(),
  outcome_score: z.number().nullable(),
  hook_style: z.string().nullable(),
  cta_type: z.string().nullable(),
  duration_seconds: z.number().min(0).nullable(),
  avatar_demographic: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const SEOSiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.string().min(1),
  niche: z.string().nullable(),
  target_audience: z.string().nullable(),
  brand_voice: z.string().nullable(),
  notion_database_id: z.string().nullable(),
  created_at: z.string(),
});

export const BlogPostSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  status: BlogPostStatusSchema,
  target_keyword: z.string().nullable(),
  secondary_keywords: z.array(z.string()).nullable(),
  meta_description: z.string().nullable(),
  content: z.string().nullable(),
  word_count: z.number().int().min(0).nullable(),
  seo_score: z.number().min(0).max(100).nullable(),
  published_url: z.string().url().nullable(),
  published_at: z.string().nullable(),
  notion_page_id: z.string().nullable(),
  notion_last_synced_at: z.string().nullable(),
  assigned_agent_id: z.string().uuid().nullable(),
  estimated_traffic: z.number().int().min(0).nullable(),
  actual_traffic: z.number().int().min(0).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const KeywordSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  keyword: z.string().min(1),
  search_volume: z.number().int().min(0).nullable(),
  difficulty: z.number().min(0).max(100).nullable(),
  current_rank: z.number().int().min(0).nullable(),
  target_rank: z.number().int().min(0).nullable(),
  linked_post_id: z.string().uuid().nullable(),
  last_checked_at: z.string().nullable(),
  created_at: z.string(),
});

export const VATaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  project_id: z.string().uuid().nullable(),
  assigned_to: z.string().nullable(),
  priority: PrioritySchema,
  status: VATaskStatusSchema,
  due_date: z.string().nullable(),
  recurring: z.boolean(),
  recurrence_rule: z.string().nullable(),
  attachments: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  notion_task_id: z.string().nullable(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const NotionSyncLogSchema = z.object({
  id: z.string().uuid(),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  notion_id: z.string().min(1),
  direction: NotionSyncDirectionSchema,
  status: NotionSyncStatusSchema,
  error_message: z.string().nullable(),
  synced_at: z.string(),
});

export const ActivityLogEntrySchema = z.object({
  id: z.string().uuid(),
  event_type: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  description: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});

export const DaemonStatusSchema = z.object({
  daemon_id: z.string(),
  name: z.string().min(1),
  status: z.enum(["running", "stopped", "error"]),
  uptime_seconds: z.number().min(0),
  last_heartbeat_at: z.string(),
  active_jobs: z.number().int().min(0),
  queued_jobs: z.number().int().min(0),
  memory_usage_mb: z.number().min(0),
  cpu_percent: z.number().min(0).max(100),
  version: z.string(),
  started_at: z.string(),
  error_message: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Create Input Schemas (omit id, timestamps, computed fields)
// ---------------------------------------------------------------------------

export const ProjectCreateSchema = ProjectSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const ProjectUpdateSchema = ProjectCreateSchema.partial();

export const AgentCreateSchema = AgentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  total_runs: true,
  total_cost_usd: true,
});

export const AgentUpdateSchema = AgentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial();

export const SkillCreateSchema = SkillSchema.omit({
  id: true,
  created_at: true,
  usage_count: true,
});

export const SkillUpdateSchema = SkillSchema.omit({
  id: true,
  created_at: true,
}).partial();

export const TaskCreateSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  session_count: true,
  total_cost_usd: true,
  failure_count: true,
  loop_detected: true,
});

export const TaskUpdateSchema = TaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial();

export const ScheduledJobCreateSchema = ScheduledJobSchema.omit({
  id: true,
  created_at: true,
  run_count: true,
  fail_count: true,
  is_running: true,
});

export const ScheduledJobUpdateSchema = ScheduledJobSchema.omit({
  id: true,
  created_at: true,
}).partial();

export const InboxMessageCreateSchema = InboxMessageSchema.omit({
  id: true,
  created_at: true,
  status: true,
  action_taken: true,
  actioned_at: true,
  notion_synced: true,
});

export const InboxMessageUpdateSchema = InboxMessageSchema.omit({
  id: true,
  created_at: true,
}).partial();

export const RunHistoryCreateSchema = RunHistorySchema.omit({
  id: true,
});

export const RunHistoryUpdateSchema = RunHistorySchema.omit({
  id: true,
}).partial();

export const AgentTaskLogCreateSchema = AgentTaskLogSchema.omit({
  id: true,
  created_at: true,
});

export const PromptVersionRegistryCreateSchema =
  PromptVersionRegistrySchema.omit({
    id: true,
    created_at: true,
    avg_score: true,
    run_count: true,
    approved_at: true,
  });

export const PromptVersionRegistryUpdateSchema =
  PromptVersionRegistrySchema.omit({
    id: true,
    created_at: true,
  }).partial();

export const PatternAnalysisLogCreateSchema = PatternAnalysisLogSchema.omit({
  id: true,
  created_at: true,
});

export const ViralReelCreateSchema = ViralReelSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const ViralReelUpdateSchema = ViralReelCreateSchema.partial();

export const SEOSiteCreateSchema = SEOSiteSchema.omit({
  id: true,
  created_at: true,
});

export const SEOSiteUpdateSchema = SEOSiteCreateSchema.partial();

export const BlogPostCreateSchema = BlogPostSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const BlogPostUpdateSchema = BlogPostCreateSchema.partial();

export const KeywordCreateSchema = KeywordSchema.omit({
  id: true,
  created_at: true,
});

export const KeywordUpdateSchema = KeywordCreateSchema.partial();

export const VATaskCreateSchema = VATaskSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const VATaskUpdateSchema = VATaskCreateSchema.partial();

export const NotionSyncLogCreateSchema = NotionSyncLogSchema.omit({
  id: true,
});

export const ActivityLogEntryCreateSchema = ActivityLogEntrySchema.omit({
  id: true,
  created_at: true,
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types from Zod (useful for consumers that want
// Zod-derived types rather than the hand-written ones in types.ts)
// ---------------------------------------------------------------------------

export type ProjectZ = z.infer<typeof ProjectSchema>;
export type AgentZ = z.infer<typeof AgentSchema>;
export type SkillZ = z.infer<typeof SkillSchema>;
export type TaskZ = z.infer<typeof TaskSchema>;
export type ScheduledJobZ = z.infer<typeof ScheduledJobSchema>;
export type InboxMessageZ = z.infer<typeof InboxMessageSchema>;
export type RunHistoryZ = z.infer<typeof RunHistorySchema>;
export type AgentTaskLogZ = z.infer<typeof AgentTaskLogSchema>;
export type PromptVersionRegistryZ = z.infer<
  typeof PromptVersionRegistrySchema
>;
export type PatternAnalysisLogZ = z.infer<typeof PatternAnalysisLogSchema>;
export type ViralReelZ = z.infer<typeof ViralReelSchema>;
export type SEOSiteZ = z.infer<typeof SEOSiteSchema>;
export type BlogPostZ = z.infer<typeof BlogPostSchema>;
export type KeywordZ = z.infer<typeof KeywordSchema>;
export type VATaskZ = z.infer<typeof VATaskSchema>;
export type NotionSyncLogZ = z.infer<typeof NotionSyncLogSchema>;
export type ActivityLogEntryZ = z.infer<typeof ActivityLogEntrySchema>;
export type DaemonStatusZ = z.infer<typeof DaemonStatusSchema>;
