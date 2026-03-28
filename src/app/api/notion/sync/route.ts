import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { NotionSyncLog } from '@/lib/types'

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

const MOCK_SYNC_LOGS: NotionSyncLog[] = [
  {
    id: 'ns000001-0001-4000-8000-000000000001',
    entity_type: 'task',
    entity_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    notion_id: 'notion-page-abc123',
    direction: 'to_notion',
    status: 'success',
    error_message: null,
    synced_at: '2026-03-28T08:00:00Z',
  },
  {
    id: 'ns000001-0002-4000-8000-000000000002',
    entity_type: 'project',
    entity_id: 'p0000001-0001-4000-8000-000000000001',
    notion_id: 'notion-page-def456',
    direction: 'from_notion',
    status: 'success',
    error_message: null,
    synced_at: '2026-03-28T07:30:00Z',
  },
  {
    id: 'ns000001-0003-4000-8000-000000000003',
    entity_type: 'blog_post',
    entity_id: 'bp000001-0001-4000-8000-000000000001',
    notion_id: 'notion-page-ghi789',
    direction: 'to_notion',
    status: 'failed',
    error_message: 'Notion API rate limit exceeded',
    synced_at: '2026-03-27T23:00:00Z',
  },
]

interface SyncStatus {
  last_sync_at: string | null
  total_synced: number
  total_failed: number
  is_syncing: boolean
  recent_logs: NotionSyncLog[]
}

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

  let logs = [...MOCK_SYNC_LOGS]

  if (filterParse.data.entity_type) {
    logs = logs.filter((l) => l.entity_type === filterParse.data.entity_type)
  }
  if (filterParse.data.status) {
    logs = logs.filter((l) => l.status === filterParse.data.status)
  }

  const status: SyncStatus = {
    last_sync_at: logs.length > 0 ? logs[0].synced_at : null,
    total_synced: logs.filter((l) => l.status === 'success').length,
    total_failed: logs.filter((l) => l.status === 'failed').length,
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

  // TODO: Trigger actual Notion sync once services are connected
  const syncJob = {
    id: crypto.randomUUID(),
    entity_type: parse.data.entity_type,
    entity_id: parse.data.entity_id ?? null,
    direction: parse.data.direction,
    status: 'queued' as const,
    queued_at: new Date().toISOString(),
  }

  return NextResponse.json(
    { data: syncJob, message: 'Sync job queued successfully' },
    { status: 202 },
  )
}
