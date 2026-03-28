import { NextRequest, NextResponse } from 'next/server'
import { ScheduledJobCreateSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/scheduler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, count, error } = await supabase
    .from('scheduled_jobs')
    .select('*', { count: 'exact' })
    .order('next_run_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
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

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('scheduled_jobs')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
