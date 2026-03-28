import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TaskCreateSchema, KanbanStatusSchema, QuadrantSchema } from '@/lib/validation'
import type { Task } from '@/lib/types'

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

const MOCK_TASKS: Task[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated testing and deployment',
    type: 'ops',
    project_id: 'p0000001-0001-4000-8000-000000000001',
    agent_id: 'ag000001-0001-4000-8000-000000000001',
    collaborator_agent_ids: null,
    kanban_status: 'in_progress',
    quadrant: 'do',
    priority: 'high',
    ai_plan: null,
    acceptance_criteria: ['All tests pass', 'Auto-deploy to staging on merge'],
    deliverables: null,
    subtasks: [
      { id: 'sub-001', title: 'Write workflow YAML', done: true },
      { id: 'sub-002', title: 'Add test step', done: false },
    ],
    image_urls: null,
    started_at: '2026-03-25T10:00:00Z',
    completed_at: null,
    estimated_minutes: 120,
    actual_minutes: null,
    depends_on_task_ids: null,
    blocks_task_ids: null,
    notion_task_id: null,
    notion_last_synced_at: null,
    session_count: 2,
    last_session_cost_usd: 0.03,
    total_cost_usd: 0.05,
    outcome_score: null,
    failure_count: 0,
    loop_detected: false,
    pipeline_id: null,
    pipeline_position: null,
    notes: null,
    activity_log: null,
    created_at: '2026-03-24T08:00:00Z',
    updated_at: '2026-03-27T14:30:00Z',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    title: 'Research competitor SEO strategy',
    description: null,
    type: 'research',
    project_id: 'p0000001-0002-4000-8000-000000000002',
    agent_id: null,
    collaborator_agent_ids: null,
    kanban_status: 'backlog',
    quadrant: 'schedule',
    priority: 'medium',
    ai_plan: null,
    acceptance_criteria: null,
    deliverables: null,
    subtasks: null,
    image_urls: null,
    started_at: null,
    completed_at: null,
    estimated_minutes: 60,
    actual_minutes: null,
    depends_on_task_ids: null,
    blocks_task_ids: null,
    notion_task_id: null,
    notion_last_synced_at: null,
    session_count: 0,
    last_session_cost_usd: null,
    total_cost_usd: 0,
    outcome_score: null,
    failure_count: 0,
    loop_detected: false,
    pipeline_id: null,
    pipeline_position: null,
    notes: null,
    activity_log: null,
    created_at: '2026-03-26T09:00:00Z',
    updated_at: '2026-03-26T09:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Query param filter schema
// ---------------------------------------------------------------------------

const TaskFilterSchema = z.object({
  project_id: z.string().uuid().optional(),
  kanban_status: KanbanStatusSchema.optional(),
  quadrant: QuadrantSchema.optional(),
  agent_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/tasks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = TaskFilterSchema.safeParse({
    project_id: searchParams.get('project_id') ?? undefined,
    kanban_status: searchParams.get('kanban_status') ?? undefined,
    quadrant: searchParams.get('quadrant') ?? undefined,
    agent_id: searchParams.get('agent_id') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const filters = filterParse.data
  let tasks = [...MOCK_TASKS]

  if (filters.project_id) {
    tasks = tasks.filter((t) => t.project_id === filters.project_id)
  }
  if (filters.kanban_status) {
    tasks = tasks.filter((t) => t.kanban_status === filters.kanban_status)
  }
  if (filters.quadrant) {
    tasks = tasks.filter((t) => t.quadrant === filters.quadrant)
  }
  if (filters.agent_id) {
    tasks = tasks.filter((t) => t.agent_id === filters.agent_id)
  }

  return NextResponse.json({ data: tasks, count: tasks.length })
}

// ---------------------------------------------------------------------------
// POST /api/tasks
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

  const parse = TaskCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()
  const newTask: Task = {
    id: crypto.randomUUID(),
    ...parse.data,
    session_count: 0,
    total_cost_usd: 0,
    failure_count: 0,
    loop_detected: false,
    created_at: now,
    updated_at: now,
  }

  return NextResponse.json({ data: newTask }, { status: 201 })
}
