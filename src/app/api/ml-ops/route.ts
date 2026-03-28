import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AgentTaskLogCreateSchema } from '@/lib/validation'
import type { AgentTaskLog, PatternAnalysisLog, PromptVersionRegistry } from '@/lib/types'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function authenticate(req: NextRequest): boolean {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.MC_API_TOKEN
  if (!expected) return true // no token configured = open (dev mode)
  return token === expected
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_AGENT_TASK_LOGS: AgentTaskLog[] = [
  {
    id: 'atl00001-0001-4000-8000-000000000001',
    task_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    run_timestamp: '2026-03-28T08:30:00Z',
    agent_name: 'DevOps Agent',
    prompt_version: 'v1.2.0',
    model_used: 'claude-sonnet-4-20250514',
    input_tokens: 1250,
    output_tokens: 830,
    cost_usd: 0.012,
    execution_time_ms: 4500,
    task_type: 'ops',
    input_preview: 'Set up GitHub Actions workflow for CI/CD...',
    output_preview: 'Created .github/workflows/ci.yml with test and deploy steps...',
    output_word_count: 420,
    metadata: { retry_count: 0 },
    outcome_score: 8.5,
    outcome_data: { tests_passed: true, deploy_success: true },
    outcome_collected_at: '2026-03-28T08:35:00Z',
    outcome_source: 'auto',
    ab_test_id: null,
    ab_variant: null,
    pipeline_id: null,
    parent_task_id: null,
    pipeline_position: null,
    pipeline_final_score: null,
    created_at: '2026-03-28T08:30:00Z',
  },
  {
    id: 'atl00001-0002-4000-8000-000000000002',
    task_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    run_timestamp: '2026-03-27T14:00:00Z',
    agent_name: 'Content Writer',
    prompt_version: 'v2.0.1',
    model_used: 'claude-sonnet-4-20250514',
    input_tokens: 980,
    output_tokens: 2100,
    cost_usd: 0.025,
    execution_time_ms: 8200,
    task_type: 'content',
    input_preview: 'Research competitor SEO strategies for health niche...',
    output_preview: 'Competitive analysis report: Top 5 competitors identified...',
    output_word_count: 1050,
    metadata: null,
    outcome_score: 7.2,
    outcome_data: null,
    outcome_collected_at: '2026-03-27T15:00:00Z',
    outcome_source: 'manual',
    ab_test_id: 'ab-prompt-v2',
    ab_variant: 'B',
    pipeline_id: null,
    parent_task_id: null,
    pipeline_position: null,
    pipeline_final_score: null,
    created_at: '2026-03-27T14:00:00Z',
  },
]

const MOCK_PATTERN_ANALYSIS_LOGS: PatternAnalysisLog[] = [
  {
    id: 'pal00001-0001-4000-8000-000000000001',
    analysis_id: 'analysis-2026-03-28-001',
    analysis_timestamp: '2026-03-28T06:00:00Z',
    agent_name: 'DevOps Agent',
    records_analyzed: 47,
    date_range_start: '2026-03-01T00:00:00Z',
    date_range_end: '2026-03-28T00:00:00Z',
    avg_outcome_score: 8.2,
    score_delta: 0.4,
    avg_cost_per_run: 0.015,
    cost_delta: -0.002,
    overall_health_score: 85,
    optimization_warranted: false,
    confidence_level: 0.92,
    executive_summary: 'DevOps Agent performing well. Scores trending up, costs trending down.',
    full_report: null,
    created_at: '2026-03-28T06:00:00Z',
  },
]

const MOCK_PROMPT_VERSIONS: PromptVersionRegistry[] = [
  {
    id: 'pv000001-0001-4000-8000-000000000001',
    agent_name: 'DevOps Agent',
    version: 'v1.2.0',
    system_prompt: 'You are a DevOps specialist agent. Handle CI/CD, infrastructure...',
    created_at: '2026-03-20T08:00:00Z',
    created_by: 'system',
    change_log: 'Added Docker deployment instructions',
    change_log_detail: null,
    is_active: true,
    avg_score: 8.2,
    run_count: 47,
    approval_status: 'approved',
    approval_tier: 1,
    approved_at: '2026-03-20T08:30:00Z',
  },
  {
    id: 'pv000001-0002-4000-8000-000000000002',
    agent_name: 'Content Writer',
    version: 'v2.0.1',
    system_prompt: 'You are an SEO content writer. Produce high-quality blog posts...',
    created_at: '2026-03-22T10:00:00Z',
    created_by: 'system',
    change_log: 'Improved keyword density instructions',
    change_log_detail: null,
    is_active: true,
    avg_score: 7.5,
    run_count: 112,
    approval_status: 'approved',
    approval_tier: 1,
    approved_at: '2026-03-22T10:15:00Z',
  },
]

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const MlOpsFilterSchema = z.object({
  agent_name: z.string().optional(),
  view: z.enum(['task_logs', 'patterns', 'prompts', 'all']).optional(),
})

// ---------------------------------------------------------------------------
// GET /api/ml-ops
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = MlOpsFilterSchema.safeParse({
    agent_name: searchParams.get('agent_name') ?? undefined,
    view: searchParams.get('view') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const { agent_name, view = 'all' } = filterParse.data

  let taskLogs = [...MOCK_AGENT_TASK_LOGS]
  let patterns = [...MOCK_PATTERN_ANALYSIS_LOGS]
  let prompts = [...MOCK_PROMPT_VERSIONS]

  if (agent_name) {
    taskLogs = taskLogs.filter((l) => l.agent_name === agent_name)
    patterns = patterns.filter((p) => p.agent_name === agent_name)
    prompts = prompts.filter((p) => p.agent_name === agent_name)
  }

  if (view === 'task_logs') {
    return NextResponse.json({ data: { agent_task_logs: taskLogs }, count: taskLogs.length })
  }
  if (view === 'patterns') {
    return NextResponse.json({ data: { pattern_analysis_logs: patterns }, count: patterns.length })
  }
  if (view === 'prompts') {
    return NextResponse.json({ data: { prompt_versions: prompts }, count: prompts.length })
  }

  return NextResponse.json({
    data: {
      agent_task_logs: taskLogs,
      pattern_analysis_logs: patterns,
      prompt_versions: prompts,
    },
    counts: {
      agent_task_logs: taskLogs.length,
      pattern_analysis_logs: patterns.length,
      prompt_versions: prompts.length,
    },
  })
}

// ---------------------------------------------------------------------------
// POST /api/ml-ops  (log a task run)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = AgentTaskLogCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const newLog: AgentTaskLog = {
    id: crypto.randomUUID(),
    ...parse.data,
    created_at: new Date().toISOString(),
  }

  return NextResponse.json({ data: newLog }, { status: 201 })
}
