import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ProjectCreateSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data, count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count })
}

// ---------------------------------------------------------------------------
// POST /api/projects
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

  const parse = ProjectCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// ---------------------------------------------------------------------------
// PATCH /api/projects  (update project fields)
// ---------------------------------------------------------------------------

const ProjectPatchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  status: z.enum(['active', 'paused', 'archived', 'completed']).optional(),
  root_directory: z.string().nullable().optional(),
  output_directory: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
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

  const parse = ProjectPatchSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const { id, ...updates } = parse.data
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
