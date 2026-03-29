import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/daemon — Get daemon status and stats
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: { status: 'unconfigured', active_agents: 0, running_tasks: 0, pending_scheduled_jobs: 0, recent_runs: [], total_recent_cost_usd: 0, concurrency_limit: 3, poll_interval_ms: 30000 }, message: 'Database not configured' })
  }

  // Gather system stats
  const [
    { count: activeAgents },
    { count: runningTasks },
    { count: pendingJobs },
    { data: recentRuns },
  ] = await Promise.all([
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('kanban_status', 'in_progress'),
    supabase.from('scheduled_jobs').select('*', { count: 'exact', head: true }).eq('enabled', true),
    supabase.from('run_history').select('*').order('started_at', { ascending: false }).limit(10),
  ])

  // Calculate total cost from recent runs
  const totalCost = (recentRuns || []).reduce((sum, r) => sum + (r.cost_usd || 0), 0)

  return NextResponse.json({
    data: {
      status: 'running',
      active_agents: activeAgents || 0,
      running_tasks: runningTasks || 0,
      pending_scheduled_jobs: pendingJobs || 0,
      recent_runs: recentRuns || [],
      total_recent_cost_usd: totalCost,
      concurrency_limit: 3,
      poll_interval_ms: 30000,
    },
  })
}

// ---------------------------------------------------------------------------
// POST /api/daemon — Trigger daemon actions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action: string; task_id?: string; agent_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  switch (body.action) {
    case 'dispatch_task': {
      if (!body.task_id || !body.agent_id) {
        return NextResponse.json({ error: 'task_id and agent_id required' }, { status: 400 })
      }

      // Update task and agent
      const now = new Date().toISOString()
      await Promise.all([
        supabase.from('tasks').update({
          kanban_status: 'in_progress',
          agent_id: body.agent_id,
          started_at: now,
          updated_at: now,
        }).eq('id', body.task_id),
        supabase.from('agents').update({
          status: 'running',
          current_task_id: body.task_id,
          updated_at: now,
        }).eq('id', body.agent_id),
      ])

      // Create run history entry
      await supabase.from('run_history').insert({
        task_id: body.task_id,
        agent_id: body.agent_id,
        status: 'running',
      })

      // Log activity
      await supabase.from('activity_log').insert({
        event_type: 'task_dispatched',
        entity_type: 'task',
        entity_id: body.task_id,
        description: `Task dispatched to agent ${body.agent_id}`,
      })

      return NextResponse.json({ data: { dispatched: true, task_id: body.task_id, agent_id: body.agent_id } })
    }

    case 'run_scheduled_jobs': {
      // Find due jobs
      const { data: dueJobs } = await supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('enabled', true)
        .eq('is_running', false)
        .lte('next_run_at', new Date().toISOString())

      if (!dueJobs || dueJobs.length === 0) {
        return NextResponse.json({ data: { jobs_triggered: 0 } })
      }

      // Mark jobs as running
      for (const job of dueJobs) {
        await supabase.from('scheduled_jobs').update({
          is_running: true,
          last_run_at: new Date().toISOString(),
          run_count: (job.run_count || 0) + 1,
        }).eq('id', job.id)

        await supabase.from('activity_log').insert({
          event_type: 'job_run',
          entity_type: 'scheduled_job',
          entity_id: job.id,
          description: `Scheduled job "${job.name}" triggered`,
        })
      }

      return NextResponse.json({ data: { jobs_triggered: dueJobs.length } })
    }

    case 'check_loops': {
      // Find tasks with 3+ failures that aren't yet flagged
      const { data: loopedTasks } = await supabase
        .from('tasks')
        .select('id, title, failure_count, agent_id')
        .gte('failure_count', 3)
        .eq('loop_detected', false)

      if (loopedTasks && loopedTasks.length > 0) {
        for (const task of loopedTasks) {
          await supabase.from('tasks').update({ loop_detected: true }).eq('id', task.id)
          await supabase.from('inbox_messages').insert({
            type: 'approval_request',
            from_agent_id: task.agent_id,
            task_id: task.id,
            subject: `Loop detected: "${task.title}" failed ${task.failure_count} times`,
            body: `Task has failed ${task.failure_count} consecutive times. Auto-dispatch paused.`,
            requires_action: true,
            action_options: [
              { label: 'Retry', value: 'retry' },
              { label: 'Cancel', value: 'cancel' },
              { label: 'Reassign', value: 'reassign' },
            ],
          })
        }
      }

      return NextResponse.json({ data: { loops_detected: loopedTasks?.length || 0 } })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${body.action}` }, { status: 400 })
  }
}
