import type { AgentTaskLog, Task, Agent } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Action Logger - creates agent_task_log records from completed tasks
// ---------------------------------------------------------------------------

interface CompletedRunData {
  task: Task
  agent: Agent
  model: string
  prompt_version: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  duration_ms: number
  score: number | null
  success: boolean
  error_message: string | null
  metadata?: Record<string, unknown>
}

export async function logTaskRun(runData: CompletedRunData): Promise<AgentTaskLog> {
  const now = new Date().toISOString()

  const logEntry: Omit<AgentTaskLog, 'id' | 'created_at'> = {
    task_id: runData.task.id,
    run_timestamp: now,
    agent_name: runData.agent.name,
    prompt_version: runData.prompt_version,
    model_used: runData.model,
    input_tokens: runData.input_tokens,
    output_tokens: runData.output_tokens,
    cost_usd: runData.cost_usd,
    execution_time_ms: runData.duration_ms,
    task_type: runData.task.type,
    input_preview: runData.task.description?.slice(0, 200) ?? null,
    output_preview: null,
    output_word_count: null,
    metadata: {
      task_title: runData.task.title,
      task_priority: runData.task.priority,
      agent_id: runData.agent.id,
      agent_model: runData.agent.model,
      total_tokens: runData.input_tokens + runData.output_tokens,
      success: runData.success,
      error_message: runData.error_message,
      ...runData.metadata,
    },
    outcome_score: runData.score,
    outcome_data: null,
    outcome_collected_at: runData.score !== null ? now : null,
    outcome_source: runData.score !== null ? 'auto' : null,
    ab_test_id: null,
    ab_variant: null,
    pipeline_id: runData.task.pipeline_id ?? null,
    parent_task_id: null,
    pipeline_position: runData.task.pipeline_position ?? null,
    pipeline_final_score: null,
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_task_logs')
    .insert(logEntry)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to log task run: ${error.message}`)
  }

  return data as AgentTaskLog
}

export async function getRecentLogs(
  agentName: string,
  days: number = 14
): Promise<AgentTaskLog[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_task_logs')
    .select('*')
    .eq('agent_name', agentName)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch recent logs: ${error.message}`)
  }

  return (data ?? []) as AgentTaskLog[]
}

export async function getLogsByTaskId(taskId: string): Promise<AgentTaskLog[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_task_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch logs for task ${taskId}: ${error.message}`)
  }

  return (data ?? []) as AgentTaskLog[]
}
