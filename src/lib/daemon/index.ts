import type {
  DaemonStatus,
  Task,
  Agent,
  ScheduledJob,
  KanbanStatus,
  Priority,
  InboxMessageCreateInput,
} from '@/lib/types'
import { OpenClawGateway } from '@/lib/openclaw/gateway'
import {
  updateTaskStatus,
  postInboxMessage,
  logActivity,
} from '@/lib/cowork/filesystem'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Daemon state & loop detection types
// ---------------------------------------------------------------------------

interface DaemonState {
  status: DaemonStatus['status']
  active_tasks: string[]
  concurrency_limit: number
  started_at: string | null
  last_poll_at: string | null
  errors: string[]
}

interface LoopDetection {
  task_id: string
  failure_count: number
  last_failure_at: string
  approval_requested: boolean
}

type DispatchMethod = 'openclaw' | 'cowork'

// ---------------------------------------------------------------------------
// Mission Control Daemon
// ---------------------------------------------------------------------------

const CONCURRENCY_LIMIT = 3
const POLL_INTERVAL_MS = 5000
const LOOP_FAILURE_THRESHOLD = 3

export class MissionControlDaemon {
  private state: DaemonState = {
    status: 'stopped',
    active_tasks: [],
    concurrency_limit: CONCURRENCY_LIMIT,
    started_at: null,
    last_poll_at: null,
    errors: [],
  }

  private pollTimer: ReturnType<typeof setInterval> | null = null
  private scheduledJobTimer: ReturnType<typeof setInterval> | null = null
  private gateway: OpenClawGateway
  private loopTracker: Map<string, LoopDetection> = new Map()

  constructor() {
    this.gateway = new OpenClawGateway()
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.state.status === 'running') {
      return
    }

    try {
      await this.gateway.connect()
    } catch {
      // Gateway connection is optional; cowork dispatch still works
      this.state.errors.push(
        'OpenClaw gateway connection failed; cowork-only mode'
      )
    }

    this.state.status = 'running'
    this.state.started_at = new Date().toISOString()
    this.state.errors = []

    // Set up event handlers for task completion/failure
    this.gateway.on('task:complete', (event) => {
      const taskId = (event.payload as Record<string, unknown>)
        .task_id as string
      this.handleTaskComplete(taskId, event.payload as Record<string, unknown>)
    })

    this.gateway.on('task:failed', (event) => {
      const taskId = (event.payload as Record<string, unknown>)
        .task_id as string
      const errorMsg = (event.payload as Record<string, unknown>)
        .error as string
      this.handleTaskFailed(taskId, errorMsg)
    })

    // Start polling for work
    this.pollTimer = setInterval(() => {
      this.pollForWork().catch((err) => {
        this.state.errors.push(
          `Poll error: ${err instanceof Error ? err.message : String(err)}`
        )
      })
    }, POLL_INTERVAL_MS)

    // Start scheduled job checker (every 60s)
    this.scheduledJobTimer = setInterval(() => {
      this.runScheduledJobs().catch((err) => {
        this.state.errors.push(
          `Scheduler error: ${err instanceof Error ? err.message : String(err)}`
        )
      })
    }, 60000)

    await logActivity({
      event_type: 'daemon_started',
      entity_type: 'daemon',
      entity_id: 'mission-control',
      description: `Mission Control Daemon started with concurrency limit ${CONCURRENCY_LIMIT}`,
      metadata: null,
    })
  }

  async stop(): Promise<void> {
    this.state.status = 'stopped'

    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    if (this.scheduledJobTimer) {
      clearInterval(this.scheduledJobTimer)
      this.scheduledJobTimer = null
    }

    this.gateway.disconnect()

    await logActivity({
      event_type: 'daemon_stopped',
      entity_type: 'daemon',
      entity_id: 'mission-control',
      description: `Mission Control Daemon stopped. Active tasks: ${this.state.active_tasks.length}`,
      metadata: null,
    })
  }

  getStatus(): DaemonState {
    return { ...this.state }
  }

  // -------------------------------------------------------------------------
  // Work Polling - finds highest priority tasks within concurrency limit
  // -------------------------------------------------------------------------

  async pollForWork(): Promise<void> {
    if (this.state.status !== 'running') return

    const availableSlots =
      this.state.concurrency_limit - this.state.active_tasks.length
    if (availableSlots <= 0) return

    this.state.last_poll_at = new Date().toISOString()

    const supabase = await createClient()

    // Find highest priority tasks in planned status, up to available slots
    // Priority order: critical=0, high=1, medium=2, low=3
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('kanban_status', 'planned')
      .order('priority', { ascending: true })
      .limit(availableSlots)

    if (error || !tasks || tasks.length === 0) return

    for (const task of tasks as Task[]) {
      // Skip tasks involved in detected loops
      const loopInfo = this.loopTracker.get(task.id)
      if (loopInfo && loopInfo.approval_requested) continue

      await this.dispatchTask(task)
    }

    // Also check continuous missions (pipelines)
    await this.checkContinuousMissions()
  }

  // -------------------------------------------------------------------------
  // Task Dispatch - spawns via OpenClaw or Cowork
  // -------------------------------------------------------------------------

  async dispatchTask(task: Task): Promise<void> {
    const method = this.determineDispatchMethod(task)

    const supabase = await createClient()

    // Mark task as in_progress
    await supabase
      .from('tasks')
      .update({
        kanban_status: 'in_progress' as KanbanStatus,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    this.state.active_tasks.push(task.id)

    try {
      if (method === 'openclaw' && this.gateway.isConnected) {
        await this.gateway.dispatchTask({
          task_id: task.id,
          agent_id: task.agent_id ?? '',
          input: { title: task.title, description: task.description },
          timeout_ms: 300000,
        })
      } else {
        // Cowork dispatch: update the filesystem for the agent to pick up
        await updateTaskStatus(task.id, 'in_progress')
      }

      await logActivity({
        event_type: 'task_dispatched',
        entity_type: 'task',
        entity_id: task.id,
        description: `Dispatched task "${task.title}" via ${method} to agent ${task.agent_id ?? 'unassigned'}`,
        metadata: { method, agent_id: task.agent_id },
      })
    } catch (err) {
      // Revert to planned on dispatch failure
      await supabase
        .from('tasks')
        .update({
          kanban_status: 'planned' as KanbanStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)

      this.state.active_tasks = this.state.active_tasks.filter(
        (id) => id !== task.id
      )

      this.state.errors.push(
        `Dispatch failed for task ${task.id}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // -------------------------------------------------------------------------
  // Continuous Missions - dispatches next task in pipeline
  // -------------------------------------------------------------------------

  async checkContinuousMissions(): Promise<void> {
    const supabase = await createClient()

    // Find tasks that are part of a pipeline and are next in line
    const { data: pipelineTasks, error } = await supabase
      .from('tasks')
      .select('*')
      .not('pipeline_id', 'is', null)
      .eq('kanban_status', 'planned')
      .order('pipeline_position', { ascending: true })

    if (error || !pipelineTasks) return

    // Group by pipeline_id
    const byPipeline = new Map<string, Task[]>()
    for (const task of pipelineTasks as Task[]) {
      if (!task.pipeline_id) continue
      const existing = byPipeline.get(task.pipeline_id) ?? []
      existing.push(task)
      byPipeline.set(task.pipeline_id, existing)
    }

    for (const [pipelineId, tasks] of byPipeline) {
      // Check if there's already an active task in this pipeline
      const hasActiveInPipeline = this.state.active_tasks.some((activeId) =>
        tasks.some((t) => t.id === activeId)
      )

      if (hasActiveInPipeline) continue

      // Check if we have capacity
      if (this.state.active_tasks.length >= this.state.concurrency_limit) break

      // Dispatch the first planned task in the pipeline
      const nextTask = tasks[0]
      if (nextTask) {
        await this.dispatchTask(nextTask)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Loop Detection - 3 failures = inbox approval request
  // -------------------------------------------------------------------------

  async detectLoops(taskId: string): Promise<boolean> {
    const existing = this.loopTracker.get(taskId)
    const now = new Date().toISOString()

    if (!existing) {
      this.loopTracker.set(taskId, {
        task_id: taskId,
        failure_count: 1,
        last_failure_at: now,
        approval_requested: false,
      })
      return false
    }

    existing.failure_count++
    existing.last_failure_at = now

    if (
      existing.failure_count >= LOOP_FAILURE_THRESHOLD &&
      !existing.approval_requested
    ) {
      existing.approval_requested = true

      const inboxMessage: InboxMessageCreateInput = {
        type: 'approval_request',
        from_agent_id: null,
        task_id: taskId,
        subject: `Loop detected: Task failed ${existing.failure_count} times`,
        body:
          `Task ${taskId} has failed ${existing.failure_count} consecutive times. ` +
          `Last failure at ${existing.last_failure_at}. ` +
          `The task has been paused pending approval to retry or cancel.`,
        requires_action: true,
        action_options: [{ label: 'Retry', value: 'retry' }, { label: 'Cancel', value: 'cancel' }, { label: 'Reassign', value: 'reassign' }],
      }

      await postInboxMessage(inboxMessage)

      await logActivity({
        event_type: 'loop_detected',
        entity_type: 'task',
        entity_id: taskId,
        description: `Task ${taskId} failed ${existing.failure_count} times. Approval request sent to inbox.`,
        metadata: {
          failure_count: existing.failure_count,
          last_failure_at: existing.last_failure_at,
        },
      })

      return true
    }

    return false
  }

  // -------------------------------------------------------------------------
  // Scheduled Jobs - checks cron expressions
  // -------------------------------------------------------------------------

  async runScheduledJobs(): Promise<void> {
    if (this.state.status !== 'running') return

    const supabase = await createClient()
    const now = new Date()

    const { data: jobs, error } = await supabase
      .from('scheduled_jobs')
      .select('*')
      .eq('enabled', true)
      .eq('is_running', false)
      .lte('next_run_at', now.toISOString())

    if (error || !jobs || jobs.length === 0) return

    for (const job of jobs as ScheduledJob[]) {
      // Check if we have capacity
      if (this.state.active_tasks.length >= this.state.concurrency_limit) break

      // Check overlap prevention
      if (job.prevent_overlap && job.is_running) continue

      try {
        // Mark job as running
        await supabase
          .from('scheduled_jobs')
          .update({ is_running: true })
          .eq('id', job.id)

        // Create a task from the job
        const taskData = {
          title: job.name,
          description: job.description ?? `Scheduled job: ${job.name}`,
          type: 'ops' as const,
          kanban_status: 'planned' as KanbanStatus,
          priority: 'medium' as Priority,
          agent_id: job.agent_id,
          project_id: job.project_id,
          notes: `Auto-created from scheduled job ${job.id}`,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }

        const { error: insertError } = await supabase
          .from('tasks')
          .insert(taskData)

        if (insertError) {
          this.state.errors.push(
            `Failed to create task for job ${job.name}: ${insertError.message}`
          )
          await supabase
            .from('scheduled_jobs')
            .update({ is_running: false })
            .eq('id', job.id)
          continue
        }

        // Calculate next run time from cron expression
        const nextRunAt = calculateNextRun(job.cron_expression, now)

        await supabase
          .from('scheduled_jobs')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt?.toISOString() ?? null,
            run_count: job.run_count + 1,
            is_running: false,
          })
          .eq('id', job.id)

        await logActivity({
          event_type: 'scheduled_job_triggered',
          entity_type: 'scheduled_job',
          entity_id: job.id,
          description: `Triggered scheduled job "${job.name}". Next run: ${nextRunAt?.toISOString() ?? 'none'}`,
          metadata: { cron: job.cron_expression, run_count: job.run_count + 1 },
        })
      } catch (err) {
        await supabase
          .from('scheduled_jobs')
          .update({
            is_running: false,
            fail_count: job.fail_count + 1,
            last_run_status: 'failed',
          })
          .eq('id', job.id)

        this.state.errors.push(
          `Scheduled job error (${job.name}): ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  private async handleTaskComplete(
    taskId: string,
    _payload: Record<string, unknown>
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('tasks')
      .update({
        kanban_status: 'done' as KanbanStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    this.state.active_tasks = this.state.active_tasks.filter(
      (id) => id !== taskId
    )

    // Clear loop tracker on success
    this.loopTracker.delete(taskId)

    await updateTaskStatus(taskId, 'done')
    await logActivity({
      event_type: 'task_completed',
      entity_type: 'task',
      entity_id: taskId,
      description: `Task ${taskId} completed successfully`,
      metadata: null,
    })
  }

  private async handleTaskFailed(
    taskId: string,
    errorMessage: string
  ): Promise<void> {
    const supabase = await createClient()

    this.state.active_tasks = this.state.active_tasks.filter(
      (id) => id !== taskId
    )

    // Check for loop detection
    const isLoop = await this.detectLoops(taskId)

    if (isLoop) {
      // Mark as blocked pending approval
      await supabase
        .from('tasks')
        .update({
          kanban_status: 'blocked' as KanbanStatus,
          loop_detected: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
    } else {
      // Get current failure count
      const { data: task } = await supabase
        .from('tasks')
        .select('failure_count')
        .eq('id', taskId)
        .single()

      const failureCount = ((task as Task | null)?.failure_count ?? 0) + 1

      // Requeue for retry by setting back to planned
      await supabase
        .from('tasks')
        .update({
          kanban_status: 'planned' as KanbanStatus,
          failure_count: failureCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
    }

    await updateTaskStatus(taskId, 'blocked')
    await logActivity({
      event_type: 'task_failed',
      entity_type: 'task',
      entity_id: taskId,
      description: `Task ${taskId} failed: ${errorMessage}. Loop detected: ${isLoop}`,
      metadata: { error: errorMessage, loop_detected: isLoop },
    })
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private determineDispatchMethod(task: Task): DispatchMethod {
    if (task.agent_id && this.gateway.isConnected) {
      return 'openclaw'
    }
    return 'cowork'
  }
}

// ---------------------------------------------------------------------------
// Cron Parser (simplified)
// ---------------------------------------------------------------------------

function calculateNextRun(cron: string, from: Date): Date | null {
  if (!cron || cron.trim() === '') return null

  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return null

  const [minuteStr, hourStr, dayOfMonthStr, monthStr, dayOfWeekStr] = parts

  const next = new Date(from)
  next.setSeconds(0)
  next.setMilliseconds(0)

  // Handle common cron patterns
  if (minuteStr === '*' && hourStr === '*') {
    // Every minute
    next.setMinutes(next.getMinutes() + 1)
    return next
  }

  if (hourStr === '*') {
    // Specific minute each hour
    const minute = parseInt(minuteStr, 10)
    if (!isNaN(minute)) {
      next.setMinutes(minute)
      if (next <= from) {
        next.setHours(next.getHours() + 1)
      }
      return next
    }
  }

  // Specific hour and minute
  const minute = parseInt(minuteStr, 10)
  const hour = parseInt(hourStr, 10)
  if (!isNaN(minute) && !isNaN(hour)) {
    next.setHours(hour)
    next.setMinutes(minute)
    if (next <= from) {
      next.setDate(next.getDate() + 1)
    }

    // Handle day of week constraint
    if (dayOfWeekStr !== '*') {
      const targetDay = parseInt(dayOfWeekStr, 10)
      if (!isNaN(targetDay)) {
        while (next.getDay() !== targetDay) {
          next.setDate(next.getDate() + 1)
        }
      }
    }

    // Handle day of month constraint
    if (dayOfMonthStr !== '*') {
      const targetDom = parseInt(dayOfMonthStr, 10)
      if (!isNaN(targetDom)) {
        next.setDate(targetDom)
        if (next <= from) {
          next.setMonth(next.getMonth() + 1)
        }
      }
    }

    // Handle month constraint
    if (monthStr !== '*') {
      const targetMonth = parseInt(monthStr, 10) - 1 // cron months are 1-based
      if (!isNaN(targetMonth)) {
        next.setMonth(targetMonth)
        if (next <= from) {
          next.setFullYear(next.getFullYear() + 1)
        }
      }
    }

    return next
  }

  // Fallback: run again in 24 hours
  next.setDate(next.getDate() + 1)
  return next
}
