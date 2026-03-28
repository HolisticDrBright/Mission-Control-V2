import { NextRequest, NextResponse } from 'next/server'
import { VATaskCreateSchema } from '@/lib/validation'
import type { VATask } from '@/lib/types'

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

const MOCK_VA_TASKS: VATask[] = [
  {
    id: 'va000001-0001-4000-8000-000000000001',
    title: 'Schedule social media posts for next week',
    description: 'Prepare and schedule 7 Instagram posts and 5 Twitter posts.',
    project_id: 'p0000001-0002-4000-8000-000000000002',
    assigned_to: 'maria@example.com',
    priority: 'high',
    status: 'in_progress',
    due_date: '2026-03-30T17:00:00Z',
    recurring: true,
    recurrence_rule: 'FREQ=WEEKLY;BYDAY=FR',
    attachments: null,
    notes: 'Use the new brand guidelines.',
    notion_task_id: null,
    completed_at: null,
    created_at: '2026-03-25T08:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
  },
  {
    id: 'va000001-0002-4000-8000-000000000002',
    title: 'Respond to customer support emails',
    description: null,
    project_id: null,
    assigned_to: 'maria@example.com',
    priority: 'medium',
    status: 'pending',
    due_date: '2026-03-28T17:00:00Z',
    recurring: true,
    recurrence_rule: 'FREQ=DAILY',
    attachments: null,
    notes: null,
    notion_task_id: null,
    completed_at: null,
    created_at: '2026-03-20T08:00:00Z',
    updated_at: '2026-03-28T08:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// GET /api/va-tasks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: MOCK_VA_TASKS, count: MOCK_VA_TASKS.length })
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

  const now = new Date().toISOString()
  const newTask: VATask = {
    id: crypto.randomUUID(),
    ...parse.data,
    created_at: now,
    updated_at: now,
  }

  return NextResponse.json({ data: newTask }, { status: 201 })
}
