import { NextRequest, NextResponse } from 'next/server'

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
// Workspace context types
// ---------------------------------------------------------------------------

interface WorkspaceContext {
  active_agents: AgentSummary[]
  active_tasks: TaskSummary[]
  recent_activity: ActivityItem[]
  system_health: SystemHealth
  timestamp: string
}

interface AgentSummary {
  id: string
  name: string
  status: string
  current_task: string | null
  last_heartbeat: string
}

interface TaskSummary {
  id: string
  title: string
  agent_id: string | null
  kanban_status: string
  priority: string
}

interface ActivityItem {
  id: string
  event_type: string
  description: string
  entity_type: string
  entity_id: string
  timestamp: string
}

interface SystemHealth {
  agents_online: number
  agents_total: number
  tasks_in_progress: number
  tasks_blocked: number
  avg_agent_score: number
  total_cost_today_usd: number
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_WORKSPACE_CONTEXT: WorkspaceContext = {
  active_agents: [
    {
      id: 'ag000001-0001-4000-8000-000000000001',
      name: 'DevOps Agent',
      status: 'idle',
      current_task: null,
      last_heartbeat: '2026-03-28T09:55:00Z',
    },
    {
      id: 'ag000001-0002-4000-8000-000000000002',
      name: 'Content Writer',
      status: 'running',
      current_task: 'Research competitor SEO strategy',
      last_heartbeat: '2026-03-28T09:58:00Z',
    },
  ],
  active_tasks: [
    {
      id: 'a1b2c3d4-0001-4000-8000-000000000001',
      title: 'Set up CI/CD pipeline',
      agent_id: 'ag000001-0001-4000-8000-000000000001',
      kanban_status: 'in_progress',
      priority: 'high',
    },
    {
      id: 'a1b2c3d4-0002-4000-8000-000000000002',
      title: 'Research competitor SEO strategy',
      agent_id: null,
      kanban_status: 'backlog',
      priority: 'medium',
    },
  ],
  recent_activity: [
    {
      id: 'act-001',
      event_type: 'task_started',
      description: 'DevOps Agent started "Set up CI/CD pipeline"',
      entity_type: 'task',
      entity_id: 'a1b2c3d4-0001-4000-8000-000000000001',
      timestamp: '2026-03-28T09:30:00Z',
    },
    {
      id: 'act-002',
      event_type: 'agent_heartbeat',
      description: 'Content Writer checked in - running task',
      entity_type: 'agent',
      entity_id: 'ag000001-0002-4000-8000-000000000002',
      timestamp: '2026-03-28T09:58:00Z',
    },
    {
      id: 'act-003',
      event_type: 'sync_completed',
      description: 'Notion sync completed for 3 tasks',
      entity_type: 'system',
      entity_id: 'notion-sync',
      timestamp: '2026-03-28T08:00:00Z',
    },
  ],
  system_health: {
    agents_online: 2,
    agents_total: 2,
    tasks_in_progress: 1,
    tasks_blocked: 0,
    avg_agent_score: 8.0,
    total_cost_today_usd: 0.037,
  },
  timestamp: '2026-03-28T10:00:00Z',
}

// ---------------------------------------------------------------------------
// GET /api/cowork  (read workspace context)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    data: {
      ...MOCK_WORKSPACE_CONTEXT,
      timestamp: new Date().toISOString(),
    },
  })
}
