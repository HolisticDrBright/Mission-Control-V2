import type {
  AgentTaskLog,
  PatternAnalysisLog,
} from '@/lib/types'
import { getRecentLogs } from '@/lib/ml-ops/logger'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Anomaly types
// ---------------------------------------------------------------------------

type AnomalyType =
  | 'logger_silence'
  | 'score_collapse'
  | 'cost_spike'
  | 'scoring_drought'
  | 'version_drift'
  | 'optimizer_loop'

interface Anomaly {
  type: AnomalyType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  data: Record<string, unknown>
  detected_at: string
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const SILENCE_THRESHOLD_HOURS = 48
const SCORE_COLLAPSE_THRESHOLD = 0.3
const COST_SPIKE_MULTIPLIER = 2.5
const SCORING_DROUGHT_THRESHOLD = 0.5
const VERSION_DRIFT_THRESHOLD = 3
const OPTIMIZER_LOOP_THRESHOLD = 5

// ---------------------------------------------------------------------------
// Analyze Agent - reads last 14 days of logs, computes stats
// ---------------------------------------------------------------------------

export async function analyzeAgent(agentName: string): Promise<PatternAnalysisLog> {
  const logs = await getRecentLogs(agentName, 14)
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(periodStart.getDate() - 14)

  if (logs.length === 0) {
    return buildEmptyAnalysis(agentName, periodStart, now)
  }

  const totalRuns = logs.length
  const scoredRuns = logs.filter((l) => l.outcome_score !== null)

  const avgScore =
    scoredRuns.length > 0
      ? scoredRuns.reduce((sum, l) => sum + (l.outcome_score ?? 0), 0) /
        scoredRuns.length
      : null

  const avgCostPerRun =
    logs.reduce((sum, l) => sum + l.cost_usd, 0) / totalRuns

  // Compute score delta (compare first half to second half)
  let scoreDelta: number | null = null
  if (scoredRuns.length >= 4) {
    const midpoint = Math.floor(scoredRuns.length / 2)
    const olderScored = scoredRuns.slice(midpoint)
    const newerScored = scoredRuns.slice(0, midpoint)
    const olderAvg =
      olderScored.reduce((s, l) => s + (l.outcome_score ?? 0), 0) /
      olderScored.length
    const newerAvg =
      newerScored.reduce((s, l) => s + (l.outcome_score ?? 0), 0) /
      newerScored.length
    scoreDelta = newerAvg - olderAvg
  }

  // Compute cost delta
  let costDelta: number | null = null
  if (logs.length >= 4) {
    const midpoint = Math.floor(logs.length / 2)
    const olderCost =
      logs.slice(midpoint).reduce((s, l) => s + l.cost_usd, 0) /
      logs.slice(midpoint).length
    const newerCost =
      logs.slice(0, midpoint).reduce((s, l) => s + l.cost_usd, 0) /
      logs.slice(0, midpoint).length
    costDelta = newerCost - olderCost
  }

  const anomalies = detectAnomalies(logs, { avgScore, avgCostPerRun })

  const optimizationWarranted =
    anomalies.some((a) => a.severity === 'high' || a.severity === 'critical')

  const overallHealthScore = computeHealthScore(logs, anomalies)

  const recommendations = generateRecommendations(anomalies, {
    avgScore,
    avgCostPerRun,
    totalRuns,
  })

  const analysis: Omit<PatternAnalysisLog, 'id' | 'created_at'> = {
    analysis_id: crypto.randomUUID(),
    analysis_timestamp: now.toISOString(),
    agent_name: agentName,
    records_analyzed: totalRuns,
    date_range_start: periodStart.toISOString(),
    date_range_end: now.toISOString(),
    avg_outcome_score: avgScore,
    score_delta: scoreDelta,
    avg_cost_per_run: avgCostPerRun,
    cost_delta: costDelta,
    overall_health_score: overallHealthScore,
    optimization_warranted: optimizationWarranted,
    confidence_level:
      totalRuns >= 20 ? 0.9 : totalRuns >= 10 ? 0.7 : totalRuns >= 5 ? 0.5 : 0.3,
    executive_summary: buildExecutiveSummary(
      agentName,
      totalRuns,
      avgScore,
      avgCostPerRun,
      anomalies,
      recommendations
    ),
    full_report: JSON.stringify({ anomalies, recommendations }),
  }

  // Persist the analysis
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pattern_analysis_logs')
    .insert(analysis)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save pattern analysis: ${error.message}`)
  }

  return data as PatternAnalysisLog
}

// ---------------------------------------------------------------------------
// Anomaly Detection
// ---------------------------------------------------------------------------

interface StatsContext {
  avgScore: number | null
  avgCostPerRun: number
}

export function detectAnomalies(
  logs: AgentTaskLog[],
  stats: StatsContext
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const now = new Date()

  // 1. Logger Silence: no logs in SILENCE_THRESHOLD_HOURS
  if (logs.length > 0) {
    const latestLog = new Date(logs[0].created_at)
    const hoursSinceLastLog =
      (now.getTime() - latestLog.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastLog > SILENCE_THRESHOLD_HOURS) {
      anomalies.push(
        buildAnomaly('logger_silence', 'medium', {
          message: `No logs for ${Math.round(hoursSinceLastLog)}h (threshold: ${SILENCE_THRESHOLD_HOURS}h)`,
          data: { hours_silent: hoursSinceLastLog },
        })
      )
    }
  }

  // 2. Score Collapse: recent scores significantly lower than overall
  if (stats.avgScore !== null && logs.length >= 6) {
    const recentLogs = logs.slice(0, Math.ceil(logs.length / 3))
    const recentScored = recentLogs.filter((l) => l.outcome_score !== null)
    if (recentScored.length > 0) {
      const recentAvg =
        recentScored.reduce((s, l) => s + (l.outcome_score ?? 0), 0) /
        recentScored.length
      const drop = (stats.avgScore - recentAvg) / stats.avgScore

      if (drop > SCORE_COLLAPSE_THRESHOLD) {
        anomalies.push(
          buildAnomaly('score_collapse', 'high', {
            message: `Score dropped ${(drop * 100).toFixed(1)}% in recent runs (${recentAvg.toFixed(2)} vs ${stats.avgScore.toFixed(2)})`,
            data: {
              recent_avg: recentAvg,
              overall_avg: stats.avgScore,
              drop_pct: drop,
            },
          })
        )
      }
    }
  }

  // 3. Cost Spike: recent costs much higher than average
  if (logs.length >= 4) {
    const recentLogs = logs.slice(0, Math.ceil(logs.length / 4))
    const recentAvgCost =
      recentLogs.reduce((s, l) => s + l.cost_usd, 0) / recentLogs.length

    if (recentAvgCost > stats.avgCostPerRun * COST_SPIKE_MULTIPLIER) {
      anomalies.push(
        buildAnomaly('cost_spike', 'high', {
          message: `Recent cost avg $${recentAvgCost.toFixed(4)} is ${(recentAvgCost / stats.avgCostPerRun).toFixed(1)}x the overall avg $${stats.avgCostPerRun.toFixed(4)}`,
          data: {
            recent_avg_cost: recentAvgCost,
            overall_avg_cost: stats.avgCostPerRun,
          },
        })
      )
    }
  }

  // 4. Scoring Drought: too many runs without outcome scores
  const unscoredRuns = logs.filter((l) => l.outcome_score === null)
  const unscoredRatio = unscoredRuns.length / logs.length
  if (unscoredRatio > SCORING_DROUGHT_THRESHOLD && logs.length >= 5) {
    anomalies.push(
      buildAnomaly('scoring_drought', 'medium', {
        message: `${(unscoredRatio * 100).toFixed(0)}% of runs have no outcome score (${unscoredRuns.length}/${logs.length})`,
        data: { unscored_count: unscoredRuns.length, total_count: logs.length },
      })
    )
  }

  // 5. Version Drift: too many distinct prompt versions
  const distinctVersions = new Set(
    logs.map((l) => l.prompt_version).filter(Boolean)
  )
  if (distinctVersions.size > VERSION_DRIFT_THRESHOLD) {
    anomalies.push(
      buildAnomaly('version_drift', 'low', {
        message: `${distinctVersions.size} distinct prompt versions in 14-day window`,
        data: {
          versions: Array.from(distinctVersions),
          count: distinctVersions.size,
        },
      })
    )
  }

  // 6. Optimizer Loop: rapid version changes suggesting thrashing
  if (logs.length >= 4) {
    let versionChanges = 0
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].prompt_version !== logs[i - 1].prompt_version) {
        versionChanges++
      }
    }

    if (versionChanges >= OPTIMIZER_LOOP_THRESHOLD) {
      anomalies.push(
        buildAnomaly('optimizer_loop', 'critical', {
          message: `${versionChanges} prompt version changes detected - possible optimization thrashing`,
          data: { version_changes: versionChanges, total_runs: logs.length },
        })
      )
    }
  }

  return anomalies
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAnomaly(
  type: AnomalyType,
  severity: Anomaly['severity'],
  opts: { message: string; data: Record<string, unknown> }
): Anomaly {
  return {
    type,
    severity,
    message: opts.message,
    data: opts.data,
    detected_at: new Date().toISOString(),
  }
}

function buildEmptyAnalysis(
  agentName: string,
  periodStart: Date,
  periodEnd: Date
): PatternAnalysisLog {
  return {
    id: crypto.randomUUID(),
    analysis_id: crypto.randomUUID(),
    analysis_timestamp: periodEnd.toISOString(),
    agent_name: agentName,
    records_analyzed: 0,
    date_range_start: periodStart.toISOString(),
    date_range_end: periodEnd.toISOString(),
    avg_outcome_score: null,
    score_delta: null,
    avg_cost_per_run: null,
    cost_delta: null,
    overall_health_score: 0,
    optimization_warranted: false,
    confidence_level: 0,
    executive_summary: `No runs recorded for agent "${agentName}" in the last 14 days.`,
    full_report: JSON.stringify({
      anomalies: [
        buildAnomaly('logger_silence', 'high', {
          message: 'No runs recorded in the last 14 days',
          data: {},
        }),
      ],
      recommendations: ['Verify the agent is configured and receiving tasks.'],
    }),
    created_at: periodEnd.toISOString(),
  }
}

function computeHealthScore(logs: AgentTaskLog[], anomalies: Anomaly[]): number {
  let score = 100

  // Deduct for anomalies by severity
  for (const anomaly of anomalies) {
    switch (anomaly.severity) {
      case 'critical':
        score -= 30
        break
      case 'high':
        score -= 20
        break
      case 'medium':
        score -= 10
        break
      case 'low':
        score -= 5
        break
    }
  }

  // Deduct for low run count (less reliable)
  if (logs.length < 5) score -= 15
  else if (logs.length < 10) score -= 5

  return Math.max(0, Math.min(100, score))
}

function generateRecommendations(
  anomalies: Anomaly[],
  stats: {
    avgScore: number | null
    avgCostPerRun: number
    totalRuns: number
  }
): string[] {
  const recs: string[] = []

  for (const anomaly of anomalies) {
    switch (anomaly.type) {
      case 'logger_silence':
        recs.push(
          'Check agent connectivity and ensure task dispatch is functioning.'
        )
        break
      case 'score_collapse':
        recs.push(
          'Review recent prompt changes. Consider rolling back to last known good version.'
        )
        break
      case 'cost_spike':
        recs.push(
          'Audit recent inputs for abnormally large payloads. Consider adding input size limits.'
        )
        break
      case 'scoring_drought':
        recs.push(
          'Implement outcome scoring for this agent to enable performance tracking.'
        )
        break
      case 'version_drift':
        recs.push(
          'Consolidate prompt versions. Pin a stable version and use A/B testing for changes.'
        )
        break
      case 'optimizer_loop':
        recs.push(
          'Pause automated optimization. Manual review of prompt strategy recommended.'
        )
        break
    }
  }

  if (stats.totalRuns < 5) {
    recs.push(
      'Insufficient data for reliable analysis. Collect more runs before optimizing.'
    )
  }

  return recs
}

function buildExecutiveSummary(
  agentName: string,
  totalRuns: number,
  avgScore: number | null,
  avgCostPerRun: number,
  anomalies: Anomaly[],
  recommendations: string[]
): string {
  const scoreStr =
    avgScore !== null ? `avg score ${avgScore.toFixed(2)}` : 'no scores recorded'
  const anomalyStr =
    anomalies.length > 0
      ? `${anomalies.length} anomalies detected (${anomalies.map((a) => a.type).join(', ')})`
      : 'no anomalies'

  return [
    `Agent "${agentName}": ${totalRuns} runs in 14d, ${scoreStr}, avg cost $${avgCostPerRun.toFixed(4)}/run.`,
    `Health: ${anomalyStr}.`,
    recommendations.length > 0
      ? `Recommendations: ${recommendations.join(' ')}`
      : 'No action needed.',
  ].join(' ')
}
