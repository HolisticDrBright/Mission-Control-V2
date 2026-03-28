import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AgentTaskLogCreateSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

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
  const supabase = createAdminClient()

  if (view === 'task_logs' || view === 'all') {
    let taskLogsQuery = supabase.from('agent_task_log').select('*', { count: 'exact' }).order('run_timestamp', { ascending: false })
    if (agent_name) taskLogsQuery = taskLogsQuery.eq('agent_name', agent_name)

    if (view === 'task_logs') {
      const { data, count, error } = await taskLogsQuery
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data: { agent_task_logs: data }, count })
    }

    // view === 'all' — query all three tables in parallel
    let patternsQuery = supabase.from('pattern_analysis_log').select('*', { count: 'exact' }).order('analysis_timestamp', { ascending: false })
    let promptsQuery = supabase.from('prompt_version_registry').select('*', { count: 'exact' }).order('created_at', { ascending: false })

    if (agent_name) {
      patternsQuery = patternsQuery.eq('agent_name', agent_name)
      promptsQuery = promptsQuery.eq('agent_name', agent_name)
    }

    const [taskLogsResult, patternsResult, promptsResult] = await Promise.all([
      taskLogsQuery,
      patternsQuery,
      promptsQuery,
    ])

    if (taskLogsResult.error) return NextResponse.json({ error: taskLogsResult.error.message }, { status: 500 })
    if (patternsResult.error) return NextResponse.json({ error: patternsResult.error.message }, { status: 500 })
    if (promptsResult.error) return NextResponse.json({ error: promptsResult.error.message }, { status: 500 })

    return NextResponse.json({
      data: {
        agent_task_logs: taskLogsResult.data,
        pattern_analysis_logs: patternsResult.data,
        prompt_versions: promptsResult.data,
      },
      counts: {
        agent_task_logs: taskLogsResult.count,
        pattern_analysis_logs: patternsResult.count,
        prompt_versions: promptsResult.count,
      },
    })
  }

  if (view === 'patterns') {
    let query = supabase.from('pattern_analysis_log').select('*', { count: 'exact' }).order('analysis_timestamp', { ascending: false })
    if (agent_name) query = query.eq('agent_name', agent_name)
    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { pattern_analysis_logs: data }, count })
  }

  if (view === 'prompts') {
    let query = supabase.from('prompt_version_registry').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (agent_name) query = query.eq('agent_name', agent_name)
    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { prompt_versions: data }, count })
  }

  // Fallback (should not reach here)
  return NextResponse.json({ data: {}, counts: {} })
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

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agent_task_log')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
