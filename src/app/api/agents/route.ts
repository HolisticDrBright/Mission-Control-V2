import { NextRequest, NextResponse } from 'next/server'
import { AgentCreateSchema } from '@/lib/validation'
import type { Agent } from '@/lib/types'

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

const MOCK_AGENTS: Agent[] = [
  {
    id: 'ag000001-0001-4000-8000-000000000001',
    name: 'DevOps Agent',
    role: 'developer',
    source: 'openclaw',
    model: 'claude-sonnet-4-20250514',
    status: 'idle',
    instructions: 'Handle CI/CD, infrastructure, and deployment tasks.',
    capabilities: ['git', 'docker', 'github-actions', 'shell'],
    skills: ['deploy', 'test-runner'],
    project_id: 'p0000001-0001-4000-8000-000000000001',
    openclaw_agent_id: 'oc-agent-001',
    heartbeat_at: '2026-03-28T09:55:00Z',
    current_task_id: null,
    total_runs: 47,
    total_cost_usd: 1.23,
    avg_outcome_score: 8.2,
    created_at: '2026-03-20T08:00:00Z',
    updated_at: '2026-03-28T09:55:00Z',
  },
  {
    id: 'ag000001-0002-4000-8000-000000000002',
    name: 'Content Writer',
    role: 'content',
    source: 'cowork',
    model: 'claude-sonnet-4-20250514',
    status: 'running',
    instructions: 'Write SEO-optimized blog posts and social media content.',
    capabilities: ['seo-writing', 'keyword-research'],
    skills: ['blog-writer', 'meta-generator'],
    project_id: 'p0000001-0002-4000-8000-000000000002',
    openclaw_agent_id: null,
    heartbeat_at: '2026-03-28T09:58:00Z',
    current_task_id: 'a1b2c3d4-0002-4000-8000-000000000002',
    total_runs: 112,
    total_cost_usd: 4.56,
    avg_outcome_score: 7.8,
    created_at: '2026-03-18T10:00:00Z',
    updated_at: '2026-03-28T09:58:00Z',
  },
]

// ---------------------------------------------------------------------------
// GET /api/agents
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ data: MOCK_AGENTS, count: MOCK_AGENTS.length })
}

// ---------------------------------------------------------------------------
// POST /api/agents
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

  const parse = AgentCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()
  const newAgent: Agent = {
    id: crypto.randomUUID(),
    ...parse.data,
    total_runs: 0,
    total_cost_usd: 0,
    created_at: now,
    updated_at: now,
  }

  return NextResponse.json({ data: newAgent }, { status: 201 })
}
