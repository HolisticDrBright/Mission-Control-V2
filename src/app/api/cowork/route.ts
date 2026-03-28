import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
// GET /api/cowork  (read workspace context)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Query agents, active tasks, and recent activity in parallel
  const [agentsResult, tasksResult, activityResult] = await Promise.all([
    supabase
      .from('agents')
      .select('id, name, status, current_task_id, heartbeat_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, title, agent_id, kanban_status, priority')
      .in('kanban_status', ['in_progress', 'backlog', 'blocked', 'review'])
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('activity_log')
      .select('id, event_type, description, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (agentsResult.error) {
    return NextResponse.json({ error: agentsResult.error.message }, { status: 500 })
  }
  if (tasksResult.error) {
    return NextResponse.json({ error: tasksResult.error.message }, { status: 500 })
  }
  // Activity log table may not exist yet — treat error as empty
  const activityData = activityResult.error ? [] : (activityResult.data ?? [])

  const agents = agentsResult.data ?? []
  const tasks = tasksResult.data ?? []

  const agentsOnline = agents.filter((a) => a.status !== 'offline').length
  const tasksInProgress = tasks.filter((t) => t.kanban_status === 'in_progress').length
  const tasksBlocked = tasks.filter((t) => t.kanban_status === 'blocked').length

  return NextResponse.json({
    data: {
      active_agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        current_task: a.current_task_id,
        last_heartbeat: a.heartbeat_at,
      })),
      active_tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        agent_id: t.agent_id,
        kanban_status: t.kanban_status,
        priority: t.priority,
      })),
      recent_activity: activityData.map((a) => ({
        id: a.id,
        event_type: a.event_type,
        description: a.description,
        entity_type: a.entity_type,
        entity_id: a.entity_id,
        timestamp: a.created_at,
      })),
      system_health: {
        agents_online: agentsOnline,
        agents_total: agents.length,
        tasks_in_progress: tasksInProgress,
        tasks_blocked: tasksBlocked,
      },
      timestamp: new Date().toISOString(),
    },
  })
}
