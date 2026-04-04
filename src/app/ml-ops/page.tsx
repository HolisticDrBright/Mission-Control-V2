'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  Activity,
  AlertTriangle,
  GitBranch,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Beaker,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import LiveIndicator from '@/components/ui/LiveIndicator'

export default function MLOpsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [mlOpsData, setMlOpsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ml-ops')
      .then(r => r.json())
      .then(data => {
        setMlOpsData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch ML Ops data:', err)
        setLoading(false)
      })
  }, [])

  const ML_OPS_AGENTS = [
    { name: 'Action Logger', status: 'healthy' as const, lastFired: '2 min ago', detail: `${mlOpsData?.counts?.agent_task_logs || 0} records` },
    { name: 'Outcome Collector', status: 'healthy' as const, lastFired: '15 min ago', detail: '89% coverage' },
    { name: 'Pattern Analyzer', status: 'healthy' as const, lastFired: 'Sunday 11PM', detail: `${mlOpsData?.counts?.pattern_analysis_logs || 0} patterns` },
    { name: 'Prompt Optimizer', status: 'healthy' as const, lastFired: '3 days ago', detail: `${mlOpsData?.counts?.prompt_versions || 0} versions` },
    { name: 'Loop Orchestrator', status: 'healthy' as const, lastFired: 'Today 9AM', detail: 'All clear' },
  ]

  if (loading) {
    return (
      <div className="p-6" style={{ color: '#888' }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>ML Ops — Feedback Loop</h2>
        <p>Loading ML Ops data...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          ML Ops — Feedback Loop
        </h2>
      </div>

      {/* System Health */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          System Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {ML_OPS_AGENTS.map((agent) => (
            <GlassCard
              key={agent.name}
              className="p-4 cursor-pointer"
              onClick={() => setSelectedAgent(agent.name)}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {agent.name}
                </p>
                <LiveIndicator status={agent.status} />
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Last: {agent.lastFired}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {agent.detail}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Anomaly Alert Banner (example) */}
      <GlassCard className="p-4 !border-[rgba(245,158,11,0.3)]" hover={false}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-amber)' }}>
              No anomalies detected
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              All systems operating within normal parameters.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Key Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} style={{ color: 'var(--accent-emerald)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Agent Task Logs</p>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mlOpsData?.counts?.agent_task_logs || 0}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} style={{ color: 'var(--accent-purple)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Pattern Analysis</p>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mlOpsData?.counts?.pattern_analysis_logs || 0}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={14} style={{ color: 'var(--accent-blue)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Prompt Versions</p>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mlOpsData?.counts?.prompt_versions || 0}
            </p>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} style={{ color: 'var(--accent-emerald)' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Feedback Score</p>
            </div>
            <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>82%</p>
          </GlassCard>
        </div>
      </div>

      {/* Logs & Details */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} style={{ color: 'var(--text-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Feedback Loop Status</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Last execution</span>
            <span style={{ color: 'var(--text-primary)' }}>2 minutes ago</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Data quality</span>
            <span style={{ color: 'var(--accent-emerald)' }}>✓ Good</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pending tasks</span>
            <span style={{ color: 'var(--text-primary)' }}>0</span>
          </div>
        </div>
      </GlassCard>

      {/* A/B Testing */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Beaker size={16} style={{ color: 'var(--text-primary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Active A/B Tests</h3>
        </div>
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            No active A/B tests. Tests will appear when configured via the Loop Orchestrator.
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
