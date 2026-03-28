import { NextRequest, NextResponse } from 'next/server'
import { ProjectCreateSchema } from '@/lib/validation'
import type { Project } from '@/lib/types'

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

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p0000001-0001-4000-8000-000000000001',
    name: 'Mission Control V2',
    slug: 'mission-control-v2',
    description: 'AI operations dashboard for managing agents, tasks, and workflows',
    type: 'app_dev',
    root_directory: '/home/user/Mission-Control-V2',
    output_directory: null,
    status: 'active',
    notion_page_id: null,
    notion_last_synced_at: null,
    color: '#6366f1',
    icon: '🚀',
    created_at: '2026-03-20T08:00:00Z',
    updated_at: '2026-03-28T10:00:00Z',
  },
  {
    id: 'p0000001-0002-4000-8000-000000000002',
    name: 'Holistic Dr Bright SEO',
    slug: 'holistic-dr-bright-seo',
    description: 'SEO content pipeline for holisticdrbright.com',
    type: 'seo',
    root_directory: null,
    output_directory: null,
    status: 'active',
    notion_page_id: null,
    notion_last_synced_at: null,
    color: '#10b981',
    icon: '🌿',
    created_at: '2026-03-15T08:00:00Z',
    updated_at: '2026-03-27T16:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: MOCK_PROJECTS, count: MOCK_PROJECTS.length })
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

  const now = new Date().toISOString()
  const newProject: Project = {
    id: crypto.randomUUID(),
    ...parse.data,
    created_at: now,
    updated_at: now,
  }

  return NextResponse.json({ data: newProject }, { status: 201 })
}
