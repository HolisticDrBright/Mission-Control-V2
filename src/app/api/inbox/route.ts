import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { InboxMessageCreateSchema, InboxMessageStatusSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const InboxFilterSchema = z.object({
  status: InboxMessageStatusSchema.optional(),
  type: z.enum(['delegation', 'report', 'question', 'approval_request', 'failure_report']).optional(),
  requires_action: z.enum(['true', 'false']).optional(),
  from_agent_id: z.string().uuid().optional(),
})

// ---------------------------------------------------------------------------
// POST action schema (for mark-read / action via POST)
// ---------------------------------------------------------------------------

const InboxActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_actioned', 'dismiss']),
  message_id: z.string().uuid(),
  action_taken: z.string().optional(),
})

// ---------------------------------------------------------------------------
// PATCH body schema
// ---------------------------------------------------------------------------

const InboxPatchSchema = z.object({
  id: z.string().uuid(),
  status: InboxMessageStatusSchema.optional(),
  action_taken: z.string().nullable().optional(),
  actioned_at: z.string().nullable().optional(),
  notion_synced: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/inbox
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = InboxFilterSchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    requires_action: searchParams.get('requires_action') ?? undefined,
    from_agent_id: searchParams.get('from_agent_id') ?? undefined,
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
    return NextResponse.json({ data: [], count: 0, unread_count: 0, action_required_count: 0, message: 'Database not configured' })
  }

  let query = supabase.from('inbox_messages').select('*', { count: 'exact' })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  if (filters.requires_action !== undefined) {
    query = query.eq('requires_action', filters.requires_action === 'true')
  }
  if (filters.from_agent_id) {
    query = query.eq('from_agent_id', filters.from_agent_id)
  }

  query = query.order('created_at', { ascending: false })

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Compute summary counts from a separate query (unfiltered)
  const { count: unreadCount, error: unreadError } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread')

  if (unreadError) {
    return NextResponse.json({ error: unreadError.message }, { status: 500 })
  }

  const { count: actionRequiredCount, error: actionError } = await supabase
    .from('inbox_messages')
    .select('*', { count: 'exact', head: true })
    .eq('requires_action', true)
    .neq('status', 'actioned')

  if (actionError) {
    return NextResponse.json({ error: actionError.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count,
    unread_count: unreadCount,
    action_required_count: actionRequiredCount,
  })
}

// ---------------------------------------------------------------------------
// POST /api/inbox  (create message OR perform action)
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

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Check if this is an action request (mark-read, dismiss, etc.)
  const actionParse = InboxActionSchema.safeParse(body)
  if (actionParse.success) {
    const { action, message_id, action_taken } = actionParse.data
    const now = new Date().toISOString()

    let updatedStatus: string
    switch (action) {
      case 'mark_read':
        updatedStatus = 'read'
        break
      case 'mark_actioned':
        updatedStatus = 'actioned'
        break
      case 'dismiss':
        updatedStatus = 'dismissed'
        break
    }

    const updates: Record<string, unknown> = { status: updatedStatus }
    if (action_taken) updates.action_taken = action_taken
    if (action === 'mark_actioned') updates.actioned_at = now

    const { data, error } = await supabase
      .from('inbox_messages')
      .update(updates)
      .eq('id', message_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  }

  // Otherwise, treat as a create-message request
  const createParse = InboxMessageCreateSchema.safeParse(body)
  if (!createParse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: createParse.error.flatten() },
      { status: 422 },
    )
  }

  const { data, error } = await supabase
    .from('inbox_messages')
    .insert({
      ...createParse.data,
      status: 'unread',
      action_taken: null,
      actioned_at: null,
      notion_synced: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

// ---------------------------------------------------------------------------
// PATCH /api/inbox  (update message status)
// ---------------------------------------------------------------------------

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

  const parse = InboxPatchSchema.safeParse(body)
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
    .from('inbox_messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
