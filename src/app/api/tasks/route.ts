import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TaskCreateSchema, KanbanStatusSchema, QuadrantSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

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
  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: [], count: 0, message: 'Database not configured' })
  }

  let query = supabase.from('tasks').select('*', { count: 'exact' })

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }
  if (filters.kanban_status) {
    query = query.eq('kanban_status', filters.kanban_status)
  }
  if (filters.quadrant) {
    query = query.eq('quadrant', filters.quadrant)
  }
  if (filters.agent_id) {
    query = query.eq('agent_id', filters.agent_id)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
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

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// ---------------------------------------------------------------------------
// PATCH /api/tasks  (update task fields)
// ---------------------------------------------------------------------------

const TaskPatchSchema = z.object({
  id: z.string().uuid(),
  kanban_status: KanbanStatusSchema.optional(),
  quadrant: QuadrantSchema.optional(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  agent_id: z.string().uuid().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  estimated_minutes: z.number().nullable().optional(),
  actual_minutes: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = TaskPatchSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const { id, ...updates } = parse.data
  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
