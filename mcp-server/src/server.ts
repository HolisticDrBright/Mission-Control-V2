import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import os from 'os'
import { listRows, getRow, insertRow, updateRow, deleteRow, countRows, getDb } from './db.js'

export const server = new McpServer({ name: 'mission-control', version: '1.0.0' })

function json(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

const paginationParams = {
  limit: z.number().optional().default(50).describe('Max rows to return'),
  offset: z.number().optional().default(0).describe('Offset for pagination'),
}

// ==========================================================================
// PROJECTS
// ==========================================================================

server.tool('list_projects', 'List all projects with optional filters', {
  status: z.enum(['active', 'paused', 'archived']).optional().describe('Filter by status'),
  type: z.enum(['app_dev', 'seo', 'ugc', 'general', 'va']).optional().describe('Filter by type'),
  ...paginationParams,
}, async ({ status, type, limit, offset }) => {
  const filters: Record<string, string> = {}
  if (status) filters.status = status
  if (type) filters.type = type
  return json(await listRows('projects', { filters, order: { column: 'updated_at' }, limit, offset }))
})

server.tool('get_project', 'Get a single project by ID', {
  id: z.string().describe('Project UUID'),
}, async ({ id }) => json(await getRow('projects', id)))

server.tool('create_project', 'Create a new project', {
  name: z.string().describe('Project name'),
  slug: z.string().describe('URL-safe slug'),
  description: z.string().optional().describe('Project description'),
  type: z.enum(['app_dev', 'seo', 'ugc', 'general', 'va']).optional().default('general'),
  status: z.enum(['active', 'paused', 'archived']).optional().default('active'),
  color: z.string().optional().default('#3b82f6').describe('Accent color hex'),
  icon: z.string().optional().default('🚀').describe('Emoji icon'),
}, async (args) => json(await insertRow('projects', args)))

server.tool('update_project', 'Update project fields', {
  id: z.string().describe('Project UUID'),
  name: z.string().optional(), description: z.string().optional(),
  type: z.enum(['app_dev', 'seo', 'ugc', 'general', 'va']).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  color: z.string().optional(), icon: z.string().optional(),
}, async ({ id, ...updates }) => json(await updateRow('projects', id, updates)))

server.tool('delete_project', 'Delete a project', {
  id: z.string().describe('Project UUID'),
}, async ({ id }) => json(await deleteRow('projects', id)))

// ==========================================================================
// AGENTS
// ==========================================================================

server.tool('list_agents', 'List AI agents with optional filters', {
  status: z.enum(['idle', 'running', 'standby', 'error', 'offline']).optional(),
  role: z.enum(['developer', 'researcher', 'marketer', 'analyst', 'content', 'va', 'custom']).optional(),
  project_id: z.string().optional().describe('Filter by project'),
  ...paginationParams,
}, async ({ status, role, project_id, limit, offset }) => {
  const filters: Record<string, string> = {}
  if (status) filters.status = status
  if (role) filters.role = role
  if (project_id) filters.project_id = project_id
  return json(await listRows('agents', { filters, order: { column: 'updated_at' }, limit, offset }))
})

server.tool('get_agent', 'Get agent by ID', { id: z.string().describe('Agent UUID') }, async ({ id }) => json(await getRow('agents', id)))

server.tool('create_agent', 'Create a new AI agent', {
  name: z.string(), role: z.enum(['developer', 'researcher', 'marketer', 'analyst', 'content', 'va', 'custom']),
  source: z.enum(['openclaw', 'cowork', 'custom']).optional().default('custom'),
  model: z.string().optional().default('claude-sonnet-4-5'), instructions: z.string().optional(),
  capabilities: z.array(z.string()).optional(), project_id: z.string().optional(),
}, async (args) => json(await insertRow('agents', args)))

server.tool('update_agent', 'Update agent fields', {
  id: z.string(), status: z.enum(['idle', 'running', 'standby', 'error', 'offline']).optional(),
  model: z.string().optional(), instructions: z.string().optional(),
  current_task_id: z.string().nullable().optional(), project_id: z.string().nullable().optional(),
}, async ({ id, ...updates }) => json(await updateRow('agents', id, updates)))

server.tool('delete_agent', 'Delete an agent', { id: z.string() }, async ({ id }) => json(await deleteRow('agents', id)))

// ==========================================================================
// TASKS
// ==========================================================================

server.tool('list_tasks', 'List tasks with filters', {
  project_id: z.string().optional(), agent_id: z.string().optional(),
  kanban_status: z.enum(['backlog', 'planned', 'in_progress', 'blocked', 'review', 'testing', 'done']).optional(),
  quadrant: z.enum(['do', 'schedule', 'delegate', 'eliminate']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  type: z.enum(['plan', 'build', 'ops', 'research', 'content', 'va']).optional(),
  ...paginationParams,
}, async ({ limit, offset, ...filters }) => {
  const f: Record<string, string> = {}
  for (const [k, v] of Object.entries(filters)) { if (v) f[k] = v }
  return json(await listRows('tasks', { filters: f, order: { column: 'created_at' }, limit, offset }))
})

server.tool('get_task', 'Get task by ID', { id: z.string() }, async ({ id }) => json(await getRow('tasks', id)))

server.tool('create_task', 'Create a new task', {
  title: z.string(), description: z.string().optional(),
  type: z.enum(['plan', 'build', 'ops', 'research', 'content', 'va']).optional().default('build'),
  project_id: z.string().optional(), agent_id: z.string().optional(),
  kanban_status: z.enum(['backlog', 'planned', 'in_progress', 'blocked', 'review', 'testing', 'done']).optional().default('backlog'),
  quadrant: z.enum(['do', 'schedule', 'delegate', 'eliminate']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium'),
  acceptance_criteria: z.array(z.string()).optional(), estimated_minutes: z.number().optional(),
}, async (args) => json(await insertRow('tasks', args)))

server.tool('update_task', 'Update task fields', {
  id: z.string(), title: z.string().optional(), description: z.string().optional(),
  kanban_status: z.enum(['backlog', 'planned', 'in_progress', 'blocked', 'review', 'testing', 'done']).optional(),
  quadrant: z.enum(['do', 'schedule', 'delegate', 'eliminate']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  agent_id: z.string().nullable().optional(), notes: z.string().optional(), outcome_score: z.number().optional(),
}, async ({ id, ...updates }) => json(await updateRow('tasks', id, updates)))

server.tool('move_task', 'Move task to a kanban column (auto-sets timestamps)', {
  id: z.string(), kanban_status: z.enum(['backlog', 'planned', 'in_progress', 'blocked', 'review', 'testing', 'done']),
}, async ({ id, kanban_status }) => {
  const updates: Record<string, unknown> = { kanban_status }
  if (kanban_status === 'in_progress') updates.started_at = new Date().toISOString()
  if (kanban_status === 'done') updates.completed_at = new Date().toISOString()
  return json(await updateRow('tasks', id, updates))
})

server.tool('delete_task', 'Delete a task', { id: z.string() }, async ({ id }) => json(await deleteRow('tasks', id)))

// ==========================================================================
// INBOX
// ==========================================================================

server.tool('list_inbox', 'List inbox messages', {
  status: z.enum(['unread', 'read', 'actioned', 'dismissed']).optional(),
  type: z.enum(['delegation', 'report', 'question', 'approval_request', 'failure_report']).optional(),
  requires_action: z.boolean().optional(), ...paginationParams,
}, async ({ status, type, requires_action, limit, offset }) => {
  const filters: Record<string, string | boolean> = {}
  if (status) filters.status = status
  if (type) filters.type = type
  if (requires_action !== undefined) filters.requires_action = requires_action
  return json(await listRows('inbox_messages', { filters, order: { column: 'created_at' }, limit, offset }))
})

server.tool('get_message', 'Get inbox message by ID', { id: z.string() }, async ({ id }) => json(await getRow('inbox_messages', id)))

server.tool('create_message', 'Create an inbox message', {
  type: z.enum(['delegation', 'report', 'question', 'approval_request', 'failure_report']),
  subject: z.string(), body: z.string(),
  from_agent_id: z.string().optional(), task_id: z.string().optional(),
  requires_action: z.boolean().optional().default(false),
  action_options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
}, async (args) => json(await insertRow('inbox_messages', { ...args, status: 'unread' })))

server.tool('action_message', 'Take action on an inbox message', {
  id: z.string(), action_taken: z.string(),
}, async ({ id, action_taken }) => json(await updateRow('inbox_messages', id, { action_taken, status: 'actioned', actioned_at: new Date().toISOString() })))

server.tool('mark_read', 'Mark message as read', { id: z.string() }, async ({ id }) => json(await updateRow('inbox_messages', id, { status: 'read' })))

// ==========================================================================
// SCHEDULED JOBS
// ==========================================================================

server.tool('list_jobs', 'List scheduled/cron jobs', {
  enabled: z.boolean().optional(), job_type: z.string().optional(), ...paginationParams,
}, async ({ enabled, job_type, limit, offset }) => {
  const filters: Record<string, string | boolean> = {}
  if (enabled !== undefined) filters.enabled = enabled
  if (job_type) filters.job_type = job_type
  return json(await listRows('scheduled_jobs', { filters, order: { column: 'next_run_at', ascending: true }, limit, offset }))
})

server.tool('get_job', 'Get scheduled job by ID', { id: z.string() }, async ({ id }) => json(await getRow('scheduled_jobs', id)))

server.tool('create_job', 'Create a scheduled job', {
  name: z.string(), cron_expression: z.string(), job_type: z.enum(['reporting', 'monitoring', 'content', 'outreach', 'maintenance', 'ml_ops']),
  description: z.string().optional(), project_id: z.string().optional(), agent_id: z.string().optional(), enabled: z.boolean().optional().default(true),
}, async (args) => json(await insertRow('scheduled_jobs', args)))

server.tool('update_job', 'Update a scheduled job', {
  id: z.string(), name: z.string().optional(), cron_expression: z.string().optional(), enabled: z.boolean().optional(), description: z.string().optional(),
}, async ({ id, ...updates }) => json(await updateRow('scheduled_jobs', id, updates)))

server.tool('delete_job', 'Delete a scheduled job', { id: z.string() }, async ({ id }) => json(await deleteRow('scheduled_jobs', id)))

// ==========================================================================
// BLOG POSTS + KEYWORDS
// ==========================================================================

server.tool('list_blog_posts', 'List SEO blog posts', { site_id: z.string().optional(), status: z.string().optional(), ...paginationParams }, async ({ site_id, status, limit, offset }) => {
  const filters: Record<string, string> = {}; if (site_id) filters.site_id = site_id; if (status) filters.status = status
  return json(await listRows('blog_posts', { filters, order: { column: 'created_at' }, limit, offset }))
})
server.tool('get_blog_post', 'Get blog post by ID', { id: z.string() }, async ({ id }) => json(await getRow('blog_posts', id)))
server.tool('create_blog_post', 'Create a blog post', { site_id: z.string(), title: z.string(), target_keyword: z.string().optional(), status: z.string().optional().default('idea'), meta_description: z.string().optional(), assigned_agent_id: z.string().optional() }, async (args) => json(await insertRow('blog_posts', args)))
server.tool('update_blog_post', 'Update a blog post', { id: z.string(), title: z.string().optional(), status: z.string().optional(), content: z.string().optional(), seo_score: z.number().optional(), published_url: z.string().optional(), word_count: z.number().optional() }, async ({ id, ...u }) => json(await updateRow('blog_posts', id, u)))
server.tool('list_keywords', 'List tracked SEO keywords', { site_id: z.string().optional(), ...paginationParams }, async ({ site_id, limit, offset }) => { const f: Record<string, string> = {}; if (site_id) f.site_id = site_id; return json(await listRows('keywords', { filters: f, order: { column: 'created_at' }, limit, offset })) })
server.tool('create_keyword', 'Track a new SEO keyword', { site_id: z.string(), keyword: z.string(), search_volume: z.number().optional(), difficulty: z.number().optional(), target_rank: z.number().optional() }, async (args) => json(await insertRow('keywords', args)))

// ==========================================================================
// VA TASKS
// ==========================================================================

server.tool('list_va_tasks', 'List VA tasks', { status: z.enum(['pending', 'in_progress', 'waiting_on_you', 'review', 'done']).optional(), project_id: z.string().optional(), assigned_to: z.string().optional(), ...paginationParams }, async ({ status, project_id, assigned_to, limit, offset }) => {
  const f: Record<string, string> = {}; if (status) f.status = status; if (project_id) f.project_id = project_id; if (assigned_to) f.assigned_to = assigned_to
  return json(await listRows('va_tasks', { filters: f, order: { column: 'created_at' }, limit, offset }))
})
server.tool('create_va_task', 'Create a VA task', { title: z.string(), description: z.string().optional(), project_id: z.string().optional(), assigned_to: z.string().optional(), priority: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium'), due_date: z.string().optional() }, async (args) => json(await insertRow('va_tasks', args)))
server.tool('update_va_task', 'Update a VA task', { id: z.string(), status: z.enum(['pending', 'in_progress', 'waiting_on_you', 'review', 'done']).optional(), assigned_to: z.string().optional(), priority: z.string().optional(), notes: z.string().optional() }, async ({ id, ...u }) => json(await updateRow('va_tasks', id, u)))

// ==========================================================================
// VIRAL REELS
// ==========================================================================

server.tool('list_reels', 'List viral reels', { brand: z.enum(['holistic_dr_bright', 'dspiked', 'custom']).optional(), stage: z.string().optional(), ...paginationParams }, async ({ brand, stage, limit, offset }) => {
  const f: Record<string, string> = {}; if (brand) f.brand = brand; if (stage) f.stage = stage
  return json(await listRows('viral_reels', { filters: f, order: { column: 'created_at' }, limit, offset }))
})
server.tool('create_reel', 'Create a viral reel', { title: z.string().optional(), brand: z.enum(['holistic_dr_bright', 'dspiked', 'custom']), product: z.string().optional(), target_platform: z.string().optional().default('tiktok') }, async (args) => json(await insertRow('viral_reels', { ...args, stage: 'brief' })))
server.tool('update_reel', 'Update a viral reel', { id: z.string(), stage: z.string().optional(), selected_hook: z.string().optional(), script_final: z.string().optional() }, async ({ id, ...u }) => json(await updateRow('viral_reels', id, u)))

// ==========================================================================
// CASHCLAW
// ==========================================================================

server.tool('list_cashclaw_runs', 'List CashClaw task runs', { status: z.string().optional(), category: z.string().optional(), days: z.number().optional().default(30), ...paginationParams }, async ({ status, category, days, limit, offset }) => {
  const db = getDb(); const since = new Date(Date.now() - days * 86400000).toISOString()
  let q = db.from('cashclaw_task_runs').select('*', { count: 'exact' }).gte('created_at', since).order('created_at', { ascending: false })
  if (status) q = q.eq('status', status); if (category) q = q.eq('category', category)
  q = q.range(offset, offset + limit - 1)
  const { data, count, error } = await q; if (error) throw new Error(error.message)
  return json({ data, total: count })
})

server.tool('get_cashclaw_summary', 'Get CashClaw earnings summary', { days: z.number().optional().default(30) }, async ({ days }) => {
  const db = getDb(); const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data: runs } = await db.from('cashclaw_task_runs').select('*').gte('created_at', since)
  const all = runs || []; const completed = all.filter((r: any) => r.status === 'completed')
  const totalEarned = completed.reduce((s: number, r: any) => s + (r.earned_eth || 0), 0)
  const rated = completed.filter((r: any) => r.client_rating)
  const avgRating = rated.length > 0 ? rated.reduce((s: number, r: any) => s + r.client_rating, 0) / rated.length : 0
  return json({ days, total_earned_eth: totalEarned, tasks_completed: completed.length, tasks_declined: all.filter((r: any) => r.status === 'declined').length, avg_rating: Math.round(avgRating * 100) / 100, total_runs: all.length })
})

server.tool('list_cashclaw_clients', 'List CashClaw client profiles', { ...paginationParams }, async ({ limit, offset }) => json(await listRows('cashclaw_client_profiles', { order: { column: 'total_eth_paid' }, limit, offset })))

// ==========================================================================
// ML OPS
// ==========================================================================

server.tool('list_task_logs', 'List ML Ops agent task logs', { agent_name: z.string().optional(), ...paginationParams }, async ({ agent_name, limit, offset }) => { const f: Record<string, string> = {}; if (agent_name) f.agent_name = agent_name; return json(await listRows('agent_task_log', { filters: f, order: { column: 'run_timestamp' }, limit, offset })) })
server.tool('list_prompt_versions', 'List prompt versions', { agent_name: z.string().optional(), is_active: z.boolean().optional(), ...paginationParams }, async ({ agent_name, is_active, limit, offset }) => { const f: Record<string, string | boolean> = {}; if (agent_name) f.agent_name = agent_name; if (is_active !== undefined) f.is_active = is_active; return json(await listRows('prompt_version_registry', { filters: f, order: { column: 'created_at' }, limit, offset })) })
server.tool('list_pattern_analyses', 'List pattern analysis reports', { agent_name: z.string().optional(), ...paginationParams }, async ({ agent_name, limit, offset }) => { const f: Record<string, string> = {}; if (agent_name) f.agent_name = agent_name; return json(await listRows('pattern_analysis_log', { filters: f, order: { column: 'analysis_timestamp' }, limit, offset })) })

// ==========================================================================
// OUTREACH
// ==========================================================================

server.tool('list_outreach_signals', 'List buying signals', { signal_strength: z.enum(['hot', 'warm', 'cold']).optional(), status: z.string().optional(), ...paginationParams }, async ({ signal_strength, status, limit, offset }) => { const f: Record<string, string> = {}; if (signal_strength) f.signal_strength = signal_strength; if (status) f.status = status; return json(await listRows('mc_outreach_signals', { filters: f, order: { column: 'detected_at' }, limit, offset })) })
server.tool('list_outreach_leads', 'List outreach leads', { pipeline_stage: z.enum(['signal', 'enriched', 'email_found', 'validated', 'campaign', 'replied', 'meeting', 'closed']).optional(), reply_sentiment: z.enum(['interested', 'maybe_later', 'not_interested', 'referral', 'angry']).optional(), ...paginationParams }, async ({ pipeline_stage, reply_sentiment, limit, offset }) => { const f: Record<string, string> = {}; if (pipeline_stage) f.pipeline_stage = pipeline_stage; if (reply_sentiment) f.reply_sentiment = reply_sentiment; return json(await listRows('mc_outreach_leads', { filters: f, order: { column: 'lead_score' }, limit, offset })) })
server.tool('get_outreach_lead', 'Get lead details', { lead_id: z.string() }, async ({ lead_id }) => json(await getRow('mc_outreach_leads', lead_id, 'lead_id')))
server.tool('update_outreach_lead', 'Update outreach lead', { lead_id: z.string(), pipeline_stage: z.string().optional(), reply_sentiment: z.string().optional(), meeting_booked: z.boolean().optional(), notes: z.string().optional() }, async ({ lead_id, ...u }) => json(await updateRow('mc_outreach_leads', lead_id, u, 'lead_id')))
server.tool('list_outreach_replies', 'List email replies', { actioned: z.boolean().optional(), category: z.string().optional(), ...paginationParams }, async ({ actioned, category, limit, offset }) => { const f: Record<string, string | boolean> = {}; if (actioned !== undefined) f.actioned = actioned; if (category) f.category = category; return json(await listRows('mc_outreach_replies', { filters: f, order: { column: 'received_at' }, limit, offset })) })
server.tool('action_reply', 'Mark reply as actioned', { id: z.string(), action_taken: z.string() }, async ({ id, action_taken }) => json(await updateRow('mc_outreach_replies', id, { actioned: true, action_taken })))

// ==========================================================================
// SEO AUTOMATION
// ==========================================================================

server.tool('list_seo_trends', 'List SEO trend discoveries', { status: z.string().optional(), ...paginationParams }, async ({ status, limit, offset }) => { const f: Record<string, string> = {}; if (status) f.status = status; return json(await listRows('mc_seo_trends', { filters: f, order: { column: 'discovered_at' }, limit, offset })) })
server.tool('list_seo_keywords_auto', 'List SEO keyword research results', { priority: z.enum(['excellent', 'good', 'medium', 'skip']).optional(), status: z.string().optional(), ...paginationParams }, async ({ priority, status, limit, offset }) => { const f: Record<string, string> = {}; if (priority) f.priority = priority; if (status) f.status = status; return json(await listRows('mc_seo_keywords', { filters: f, order: { column: 'validation_score' }, limit, offset })) })
server.tool('list_seo_articles', 'List SEO articles', { status: z.enum(['draft', 'ready_for_review', 'published', 'failed_qa']).optional(), ...paginationParams }, async ({ status, limit, offset }) => { const f: Record<string, string> = {}; if (status) f.status = status; return json(await listRows('mc_seo_articles', { filters: f, order: { column: 'created_at' }, limit, offset })) })
server.tool('create_seo_article', 'Create an SEO article', { title: z.string(), keyword: z.string(), slug: z.string().optional(), meta_description: z.string().optional(), word_count: z.number().optional(), status: z.enum(['draft', 'ready_for_review', 'published', 'failed_qa']).optional().default('draft') }, async (args) => json(await insertRow('mc_seo_articles', args)))

// ==========================================================================
// ALERTS
// ==========================================================================

server.tool('list_alerts', 'List system alerts', { acknowledged: z.boolean().optional(), severity: z.enum(['critical', 'warning', 'info']).optional(), system: z.enum(['seo', 'outreach', 'cron', 'budget']).optional(), ...paginationParams }, async ({ acknowledged, severity, system, limit, offset }) => { const f: Record<string, string | boolean> = {}; if (acknowledged !== undefined) f.acknowledged = acknowledged; if (severity) f.severity = severity; if (system) f.system = system; return json(await listRows('mc_alerts', { filters: f, order: { column: 'timestamp' }, limit, offset })) })
server.tool('create_alert', 'Create a system alert', { system: z.enum(['seo', 'outreach', 'cron', 'budget']), severity: z.enum(['critical', 'warning', 'info']), issue: z.string(), action_needed: z.string().optional() }, async (args) => json(await insertRow('mc_alerts', args)))
server.tool('acknowledge_alert', 'Acknowledge an alert', { id: z.string() }, async ({ id }) => json(await updateRow('mc_alerts', id, { acknowledged: true, acknowledged_at: new Date().toISOString() })))

// ==========================================================================
// ACTIVITY LOG
// ==========================================================================

server.tool('list_activity', 'List recent activity', { event_type: z.string().optional(), entity_type: z.string().optional(), ...paginationParams }, async ({ event_type, entity_type, limit, offset }) => { const f: Record<string, string> = {}; if (event_type) f.event_type = event_type; if (entity_type) f.entity_type = entity_type; return json(await listRows('activity_log', { filters: f, order: { column: 'created_at' }, limit, offset })) })
server.tool('log_activity', 'Log an activity event', { event_type: z.string(), description: z.string(), entity_type: z.string().optional(), entity_id: z.string().optional(), metadata: z.record(z.string(), z.unknown()).optional() }, async (args) => json(await insertRow('activity_log', args)))

// ==========================================================================
// DASHBOARD / SYSTEM
// ==========================================================================

server.tool('get_dashboard_summary', 'Full overview of all Mission Control systems', {}, async () => {
  const [projects, agents, tasks, inbox, alerts, signals, leads, articles] = await Promise.all([
    countRows('projects', { status: 'active' }), countRows('agents'), countRows('tasks'),
    countRows('inbox_messages', { status: 'unread' }), countRows('mc_alerts', { acknowledged: false }),
    countRows('mc_outreach_signals'), countRows('mc_outreach_leads'), countRows('mc_seo_articles'),
  ])
  const db = getDb()
  const { data: runningAgents } = await db.from('agents').select('id, name, status, current_task_id').eq('status', 'running')
  const { data: inProgressTasks } = await db.from('tasks').select('id, title, kanban_status, agent_id').eq('kanban_status', 'in_progress').limit(10)
  const { data: hotLeads } = await db.from('mc_outreach_leads').select('lead_id, company_name, lead_score, reply_sentiment').eq('reply_sentiment', 'interested').limit(10)
  return json({ counts: { active_projects: projects, total_agents: agents, total_tasks: tasks, unread_inbox: inbox, unacked_alerts: alerts, total_signals: signals, total_leads: leads, total_articles: articles }, running_agents: runningAgents || [], in_progress_tasks: inProgressTasks || [], hot_leads: hotLeads || [] })
})

server.tool('get_budget_status', 'Get daily budget breakdown', {}, async () => {
  const db = getDb(); const today = new Date().toISOString().split('T')[0]
  const { data } = await db.from('mc_cost_log').select('*').gte('date', today)
  const entries = data || []
  const seo = entries.filter((c: any) => c.system === 'seo').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0)
  const outreach = entries.filter((c: any) => c.system === 'outreach').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0)
  const cron = entries.filter((c: any) => c.system === 'cron').reduce((s: number, c: any) => s + (c.amount_usd || 0), 0)
  const total = seo + outreach + cron
  return json({ seo, outreach, cron, total, budget: 15, remaining: 15 - total, percent_used: Math.round((total / 15) * 100) })
})

server.tool('get_system_health', 'Get server CPU, memory, disk, load metrics', {}, async () => {
  const cpus = os.cpus(); const totalMem = os.totalmem(); const freeMem = os.freemem(); const [one, five, fifteen] = os.loadavg()
  return json({ hostname: os.hostname(), platform: os.platform(), arch: os.arch(), uptime_seconds: os.uptime(), cpu: { model: cpus[0]?.model?.trim(), cores: cpus.length }, memory: { total_gb: Math.round(totalMem / 1073741824 * 100) / 100, used_gb: Math.round((totalMem - freeMem) / 1073741824 * 100) / 100, free_gb: Math.round(freeMem / 1073741824 * 100) / 100, usage_percent: Math.round(((totalMem - freeMem) / totalMem) * 100) }, load_average: { one_min: Math.round(one * 100) / 100, five_min: Math.round(five * 100) / 100, fifteen_min: Math.round(fifteen * 100) / 100 } })
})

// ==========================================================================
// RESOURCES
// ==========================================================================

server.resource('mission-control://dashboard', 'Dashboard overview', async (uri) => {
  const [projects, agents, tasks, inbox, alerts] = await Promise.all([countRows('projects', { status: 'active' }), countRows('agents', { status: 'running' }), countRows('tasks', { kanban_status: 'in_progress' }), countRows('inbox_messages', { status: 'unread' }), countRows('mc_alerts', { acknowledged: false })])
  return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ active_projects: projects, running_agents: agents, in_progress_tasks: tasks, unread_inbox: inbox, unacked_alerts: alerts }) }] }
})

server.resource('mission-control://budget', 'Daily budget status', async (uri) => {
  const db = getDb(); const today = new Date().toISOString().split('T')[0]
  const { data } = await db.from('mc_cost_log').select('system, amount_usd').gte('date', today)
  const entries = data || []; const bySystem: Record<string, number> = {}
  for (const e of entries) { bySystem[e.system] = (bySystem[e.system] || 0) + (e.amount_usd || 0) }
  const total = Object.values(bySystem).reduce((a, b) => a + b, 0)
  return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ ...bySystem, total, budget: 15, remaining: 15 - total }) }] }
})

server.resource('mission-control://alerts', 'Unacknowledged alerts', async (uri) => {
  const db = getDb(); const { data } = await db.from('mc_alerts').select('*').eq('acknowledged', false).order('timestamp', { ascending: false }).limit(20)
  return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(data || []) }] }
})
