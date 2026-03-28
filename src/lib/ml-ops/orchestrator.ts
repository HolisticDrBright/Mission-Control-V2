import type {
  Agent,
  PatternAnalysisLog,
  PromptVersionRegistry,
} from '@/lib/types'
import { analyzeAgent } from '@/lib/ml-ops/analyzer'
import { getRecentLogs } from '@/lib/ml-ops/logger'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Loop Orchestrator - coordinates ML Ops checks, optimization, deployment
// ---------------------------------------------------------------------------

interface CheckResult {
  agent_name: string
  anomaly_count: number
  recommendations: string[]
  optimization_triggered: boolean
  health_score: number | null
}

interface OrchestrationHealthCheck {
  logger_healthy: boolean
  analyzer_healthy: boolean
  orchestrator_healthy: boolean
  last_daily_check: string | null
  last_weekly_check: string | null
  errors: string[]
}

// ---------------------------------------------------------------------------
// Scheduled Checks
// ---------------------------------------------------------------------------

export async function runDailyCheck(): Promise<CheckResult[]> {
  const agents = await getAllAgents()
  const results: CheckResult[] = []

  for (const agent of agents) {
    try {
      const analysis = await triggerAnalysis(agent.name)

      const shouldOptimize = analysis.optimization_warranted

      if (shouldOptimize) {
        await triggerOptimization(agent.name)
      }

      const report = parseReport(analysis.full_report)

      results.push({
        agent_name: agent.name,
        anomaly_count: report.anomalies?.length ?? 0,
        recommendations: report.recommendations ?? [],
        optimization_triggered: shouldOptimize,
        health_score: analysis.overall_health_score,
      })
    } catch (err) {
      results.push({
        agent_name: agent.name,
        anomaly_count: -1,
        recommendations: [
          `Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
        optimization_triggered: false,
        health_score: null,
      })
    }
  }

  await recordCheckTimestamp('daily')
  return results
}

export async function runWeeklyCheck(): Promise<CheckResult[]> {
  const agents = await getAllAgents()
  const results: CheckResult[] = []

  for (const agent of agents) {
    try {
      const analysis = await triggerAnalysis(agent.name)

      // Weekly check is more aggressive: optimize even for lower confidence issues
      const shouldOptimize =
        analysis.optimization_warranted ||
        (analysis.overall_health_score !== null &&
          analysis.overall_health_score < 70 &&
          analysis.records_analyzed >= 10)

      if (shouldOptimize) {
        await triggerOptimization(agent.name)
      }

      const report = parseReport(analysis.full_report)

      results.push({
        agent_name: agent.name,
        anomaly_count: report.anomalies?.length ?? 0,
        recommendations: report.recommendations ?? [],
        optimization_triggered: shouldOptimize,
        health_score: analysis.overall_health_score,
      })
    } catch (err) {
      results.push({
        agent_name: agent.name,
        anomaly_count: -1,
        recommendations: [
          `Weekly analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        ],
        optimization_triggered: false,
        health_score: null,
      })
    }
  }

  // Also deploy any approved prompts during weekly check
  await deployApprovedPrompts()
  await recordCheckTimestamp('weekly')

  return results
}

// ---------------------------------------------------------------------------
// Analysis & Optimization
// ---------------------------------------------------------------------------

export async function triggerAnalysis(
  agentName: string
): Promise<PatternAnalysisLog> {
  return analyzeAgent(agentName)
}

export async function triggerOptimization(agentName: string): Promise<void> {
  const supabase = await createClient()

  // Get the current active prompt version
  const { data: activeVersion } = await supabase
    .from('prompt_version_registry')
    .select('*')
    .eq('agent_name', agentName)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!activeVersion) {
    return // No active prompt to optimize
  }

  // Get recent performance data
  const logs = await getRecentLogs(agentName, 14)
  if (logs.length < 5) {
    return // Not enough data to optimize
  }

  const scoredLogs = logs.filter((l) => l.outcome_score !== null)
  const avgScore =
    scoredLogs.length > 0
      ? scoredLogs.reduce((s, l) => s + (l.outcome_score ?? 0), 0) /
        scoredLogs.length
      : null

  const currentVersion = activeVersion as PromptVersionRegistry
  const newVersionNumber = incrementVersion(currentVersion.version)

  // Create a new draft prompt version flagged for optimization
  await supabase.from('prompt_version_registry').insert({
    agent_name: agentName,
    version: newVersionNumber,
    system_prompt: currentVersion.system_prompt,
    created_by: 'ml_ops_orchestrator',
    change_log: `Auto-generated optimization candidate from v${currentVersion.version}`,
    change_log_detail: `Triggered by pattern analysis. Previous avg score: ${avgScore?.toFixed(2) ?? 'N/A'}. Runs analyzed: ${logs.length}.`,
    is_active: false,
    avg_score: null,
    run_count: 0,
    approval_status: 'pending',
    approval_tier: null,
    approved_at: null,
    created_at: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Prompt Deployment
// ---------------------------------------------------------------------------

export async function deployApprovedPrompts(): Promise<number> {
  const supabase = await createClient()

  // Find all approved (but not yet deployed) prompt versions
  const { data: approved, error } = await supabase
    .from('prompt_version_registry')
    .select('*')
    .eq('approval_status', 'approved')
    .eq('is_active', false)
    .order('created_at', { ascending: true })

  if (error || !approved || approved.length === 0) {
    return 0
  }

  let deployedCount = 0

  for (const prompt of approved as PromptVersionRegistry[]) {
    const now = new Date().toISOString()

    // Deactivate the currently active version for this agent
    await supabase
      .from('prompt_version_registry')
      .update({ is_active: false })
      .eq('agent_name', prompt.agent_name)
      .eq('is_active', true)

    // Activate the approved version
    await supabase
      .from('prompt_version_registry')
      .update({
        is_active: true,
        approval_status: 'auto_deployed' as const,
        approved_at: now,
      })
      .eq('id', prompt.id)

    deployedCount++
  }

  return deployedCount
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export async function healthCheck(): Promise<OrchestrationHealthCheck> {
  const errors: string[] = []
  let loggerHealthy = false
  let analyzerHealthy = false
  let orchestratorHealthy = false

  const supabase = await createClient()

  // Check logger: verify we can query agent_task_logs
  try {
    const { error } = await supabase
      .from('agent_task_logs')
      .select('id')
      .limit(1)
    loggerHealthy = !error
    if (error) errors.push(`Logger: ${error.message}`)
  } catch (err) {
    errors.push(`Logger: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Check analyzer: verify we can query pattern_analysis_logs
  try {
    const { error } = await supabase
      .from('pattern_analysis_logs')
      .select('id')
      .limit(1)
    analyzerHealthy = !error
    if (error) errors.push(`Analyzer: ${error.message}`)
  } catch (err) {
    errors.push(
      `Analyzer: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  // Check orchestrator: verify we can query prompt_version_registry
  try {
    const { error } = await supabase
      .from('prompt_version_registry')
      .select('id')
      .limit(1)
    orchestratorHealthy = !error
    if (error) errors.push(`Orchestrator: ${error.message}`)
  } catch (err) {
    errors.push(
      `Orchestrator: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  // Get last check timestamps from daemon_status or similar table
  let lastDailyCheck: string | null = null
  let lastWeeklyCheck: string | null = null

  try {
    const { data } = await supabase
      .from('scheduled_jobs')
      .select('name, last_run_at')
      .in('name', ['ml_ops_daily_check', 'ml_ops_weekly_check'])

    if (data) {
      for (const row of data as Array<{ name: string; last_run_at: string | null }>) {
        if (row.name === 'ml_ops_daily_check') lastDailyCheck = row.last_run_at
        if (row.name === 'ml_ops_weekly_check') lastWeeklyCheck = row.last_run_at
      }
    }
  } catch {
    // Non-critical, just report nulls
  }

  return {
    logger_healthy: loggerHealthy,
    analyzer_healthy: analyzerHealthy,
    orchestrator_healthy: orchestratorHealthy,
    last_daily_check: lastDailyCheck,
    last_weekly_check: lastWeeklyCheck,
    errors,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAllAgents(): Promise<Agent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .neq('status', 'offline')

  if (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`)
  }

  return (data ?? []) as Agent[]
}

async function recordCheckTimestamp(type: 'daily' | 'weekly'): Promise<void> {
  const supabase = await createClient()
  const jobName = `ml_ops_${type}_check`
  const now = new Date().toISOString()

  await supabase
    .from('scheduled_jobs')
    .update({ last_run_at: now })
    .eq('name', jobName)
}

function incrementVersion(version: string): string {
  const match = version.match(/^v?(\d+)\.(\d+)$/)
  if (!match) {
    return `${version}.1`
  }
  const major = parseInt(match[1], 10)
  const minor = parseInt(match[2], 10)
  return `v${major}.${minor + 1}`
}

function parseReport(
  report: string | null
): { anomalies?: Array<{ type: string }>; recommendations?: string[] } {
  if (!report) return {}
  try {
    return JSON.parse(report)
  } catch {
    return {}
  }
}
