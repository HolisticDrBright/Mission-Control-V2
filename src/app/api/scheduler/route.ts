import { NextRequest, NextResponse } from 'next/server'
import { ScheduledJobCreateSchema } from '@/lib/validation'
import type { ScheduledJob } from '@/lib/types'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function authenticate(req: NextRequest): boolean {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.MC_API_TOKEN
  if (!expected) return true
  return token === expected
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_JOBS: ScheduledJob[] = [
  {
    id: 'sj000001-0001-4000-8000-000000000001',
    name: 'Daily SEO Report',
    description: 'Generate a daily SEO performance report for all sites',
    project_id: 'p0000001-0002-4000-8000-000000000002',
    agent_id: 'ag000001-0002-4000-8000-000000000002',
    job_type: 'reporting',
    cron_expression: '0 8 * * *',
    enabled: true,
    last_run_at: '2026-03-28T08:00:00Z',
    next_run_at: '2026-03-29T08:00:00Z',
    last_run_status: 'success',
    last_run_output: 'Report generated: 3 sites, 12 keywords tracked.',
    run_count: 14,
    fail_count: 1,
    prevent_overlap: true,
    is_running: false,
    created_at: '2026-03-14T08:00:00Z',
  },
  {
    id: 'sj000001-0002-4000-8000-000000000002',
    name: 'Agent Health Monitor',
    description: 'Check heartbeat and resource usage of all agents',
    project_id: null,
    agent_id: null,
    job_type: 'monitoring',
    cron_expression: '*/15 * * * *',
    enabled: true,
    last_run_at: '2026-03-28T09:45:00Z',
    next_run_at: '2026-03-28T10:00:00Z',
    last_run_status: 'success',
    last_run_output: '2 agents online, 0 errors.',
    run_count: 384,
    fail_count: 2,
    prevent_overlap: false,
    is_running: false,
    created_at: '2026-03-20T08:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// GET /api/scheduler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: MOCK_JOBS, count: MOCK_JOBS.length })
}

// ---------------------------------------------------------------------------
// POST /api/scheduler
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

  const parse = ScheduledJobCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const newJob: ScheduledJob = {
    id: crypto.randomUUID(),
    ...parse.data,
    run_count: 0,
    fail_count: 0,
    is_running: false,
    created_at: new Date().toISOString(),
  }

  return NextResponse.json({ data: newJob }, { status: 201 })
}
