import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const SyncFilterSchema = z.object({
  entity_type: z.string().optional(),
  status: z.enum(['success', 'failed', 'skipped']).optional(),
})

// ---------------------------------------------------------------------------
// POST body schema (trigger sync)
// ---------------------------------------------------------------------------

const TriggerSyncSchema = z.object({
  entity_type: z.enum(['task', 'project', 'blog_post', 'va_task', 'all']),
  entity_id: z.string().uuid().optional(),
  direction: z.enum(['to_notion', 'from_notion']).default('to_notion'),
})

// ---------------------------------------------------------------------------
// GET /api/notion/sync  (sync status + recent logs)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = SyncFilterSchema.safeParse({
    entity_type: searchParams.get('entity_type') ?? undefined,
    status: searchParams.get('status') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: { last_sync_at: null, total_synced: 0, total_failed: 0, is_syncing: false, recent_logs: [] }, message: 'Database not configured' })
  }

  let query = supabase
    .from('notion_sync_log')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(50)

  if (filterParse.data.entity_type) {
    query = query.eq('entity_type', filterParse.data.entity_type)
  }
  if (filterParse.data.status) {
    query = query.eq('status', filterParse.data.status)
  }

  const { data: logs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const successCount = logs?.filter((l) => l.status === 'success').length ?? 0
  const failedCount = logs?.filter((l) => l.status === 'failed').length ?? 0

  const status = {
    last_sync_at: logs && logs.length > 0 ? logs[0].synced_at : null,
    total_synced: successCount,
    total_failed: failedCount,
    is_syncing: false,
    recent_logs: logs,
  }

  return NextResponse.json({ data: status })
}

// ---------------------------------------------------------------------------
// POST /api/notion/sync  (trigger sync)
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

  const parse = TriggerSyncSchema.safeParse(body)
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

  // Log the sync request for now (actual sync not yet implemented)
  const syncJob = {
    entity_type: parse.data.entity_type,
    entity_id: parse.data.entity_id ?? null,
    direction: parse.data.direction,
    status: 'queued' as const,
    synced_at: new Date().toISOString(),
  }

  // Attempt to log the request to notion_sync_log
  const { data, error } = await supabase
    .from('notion_sync_log')
    .insert({
      entity_type: syncJob.entity_type,
      entity_id: syncJob.entity_id ?? '00000000-0000-0000-0000-000000000000',
      notion_id: 'pending',
      direction: syncJob.direction,
      status: 'skipped',
      error_message: 'Sync not yet implemented — request logged',
      synced_at: syncJob.synced_at,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { data, message: 'Sync job queued successfully' },
    { status: 202 },
  )
}
