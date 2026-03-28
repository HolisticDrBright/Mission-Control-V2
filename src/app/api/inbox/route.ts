import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { InboxMessageCreateSchema, InboxMessageStatusSchema } from '@/lib/validation'
import type { InboxMessage } from '@/lib/types'

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

const MOCK_MESSAGES: InboxMessage[] = [
  {
    id: 'im000001-0001-4000-8000-000000000001',
    type: 'delegation',
    from_agent_id: 'ag000001-0001-4000-8000-000000000001',
    task_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    subject: 'CI/CD pipeline needs manual approval',
    body: 'The deployment to production requires your approval. All tests passed on staging. Please review and approve the release.',
    status: 'unread',
    requires_action: true,
    action_options: [{ label: 'Approve', value: 'approve' }, { label: 'Reject', value: 'reject' }, { label: 'Defer', value: 'defer' }],
    action_taken: null,
    actioned_at: null,
    notion_synced: false,
    created_at: '2026-03-28T09:00:00Z',
  },
  {
    id: 'im000001-0002-4000-8000-000000000002',
    type: 'report',
    from_agent_id: 'ag000001-0002-4000-8000-000000000002',
    task_id: null,
    subject: 'Weekly content performance report',
    body: 'Published 3 blog posts this week. Average SEO score: 84. Top performer: "10 Natural Remedies for Better Sleep" with 890 pageviews.',
    status: 'read',
    requires_action: false,
    action_options: null,
    action_taken: null,
    actioned_at: null,
    notion_synced: true,
    created_at: '2026-03-27T17:00:00Z',
  },
  {
    id: 'im000001-0003-4000-8000-000000000003',
    type: 'failure_report',
    from_agent_id: 'ag000001-0001-4000-8000-000000000001',
    task_id: 'a1b2c3d4-0001-4000-8000-000000000001',
    subject: 'Build failure: test suite timeout',
    body: 'The integration test suite timed out after 300 seconds. This is the 2nd consecutive failure. Possible causes: database connection pool exhaustion.',
    status: 'unread',
    requires_action: true,
    action_options: [{ label: 'Investigate', value: 'investigate' }, { label: 'Retry', value: 'retry' }, { label: 'Skip Tests', value: 'skip_tests' }, { label: 'Assign to Human', value: 'assign_to_human' }],
    action_taken: null,
    actioned_at: null,
    notion_synced: false,
    created_at: '2026-03-28T10:15:00Z',
  },
  {
    id: 'im000001-0004-4000-8000-000000000004',
    type: 'question',
    from_agent_id: 'ag000001-0002-4000-8000-000000000002',
    task_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    subject: 'Clarification needed: target audience for adaptogens article',
    body: 'Should the adaptogens guide target beginners or experienced supplement users? This affects keyword selection and content depth.',
    status: 'unread',
    requires_action: true,
    action_options: [{ label: 'Beginners', value: 'beginners' }, { label: 'Experienced', value: 'experienced' }, { label: 'Both', value: 'both' }],
    action_taken: null,
    actioned_at: null,
    notion_synced: false,
    created_at: '2026-03-28T11:00:00Z',
  },
]

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
  let messages = [...MOCK_MESSAGES]

  if (filters.status) {
    messages = messages.filter((m) => m.status === filters.status)
  }
  if (filters.type) {
    messages = messages.filter((m) => m.type === filters.type)
  }
  if (filters.requires_action !== undefined) {
    const reqAction = filters.requires_action === 'true'
    messages = messages.filter((m) => m.requires_action === reqAction)
  }
  if (filters.from_agent_id) {
    messages = messages.filter((m) => m.from_agent_id === filters.from_agent_id)
  }

  const unreadCount = MOCK_MESSAGES.filter((m) => m.status === 'unread').length
  const actionRequiredCount = MOCK_MESSAGES.filter((m) => m.requires_action && m.status !== 'actioned').length

  return NextResponse.json({
    data: messages,
    count: messages.length,
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

  // Check if this is an action request (mark-read, dismiss, etc.)
  const actionParse = InboxActionSchema.safeParse(body)
  if (actionParse.success) {
    const { action, message_id, action_taken } = actionParse.data
    const message = MOCK_MESSAGES.find((m) => m.id === message_id)

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    let updatedStatus: InboxMessage['status']

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

    const updatedMessage: InboxMessage = {
      ...message,
      status: updatedStatus,
      action_taken: action_taken ?? message.action_taken,
      actioned_at: action === 'mark_actioned' ? now : message.actioned_at,
    }

    return NextResponse.json({ data: updatedMessage })
  }

  // Otherwise, treat as a create-message request
  const createParse = InboxMessageCreateSchema.safeParse(body)
  if (!createParse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: createParse.error.flatten() },
      { status: 422 },
    )
  }

  const newMessage: InboxMessage = {
    id: crypto.randomUUID(),
    ...createParse.data,
    status: 'unread',
    action_taken: null,
    actioned_at: null,
    notion_synced: false,
    created_at: new Date().toISOString(),
  }

  return NextResponse.json({ data: newMessage }, { status: 201 })
}
