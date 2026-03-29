import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ViralReelCreateSchema, ViralReelStageSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const ReelFilterSchema = z.object({
  stage: ViralReelStageSchema.optional(),
})

// ---------------------------------------------------------------------------
// GET /api/viral-reel
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = ReelFilterSchema.safeParse({
    stage: searchParams.get('stage') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: [], count: 0, message: 'Database not configured' })
  }

  let query = supabase.from('viral_reels').select('*', { count: 'exact' })

  if (filterParse.data.stage) {
    query = query.eq('stage', filterParse.data.stage)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
}

// ---------------------------------------------------------------------------
// POST /api/viral-reel  (create reel + start pipeline)
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

  const parse = ViralReelCreateSchema.safeParse(body)
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
    .from('viral_reels')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: Trigger actual pipeline (hook generation, etc.) once services are connected
  const pipelineStarted = true

  return NextResponse.json(
    { data, pipeline_started: pipelineStarted },
    { status: 201 },
  )
}
