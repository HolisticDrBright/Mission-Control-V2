import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { VATaskCreateSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const VATaskFilterSchema = z.object({
  status: z.string().optional(),
  project_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/va-tasks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = VATaskFilterSchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    project_id: searchParams.get('project_id') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  let query = supabase.from('va_tasks').select('*', { count: 'exact' })

  if (filterParse.data.status) {
    query = query.eq('status', filterParse.data.status)
  }
  if (filterParse.data.project_id) {
    query = query.eq('project_id', filterParse.data.project_id)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
}

// ---------------------------------------------------------------------------
// POST /api/va-tasks
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

  const parse = VATaskCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('va_tasks')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
