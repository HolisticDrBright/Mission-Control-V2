'use client'

import { useState } from 'react'
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

const ML_OPS_AGENTS = [
  { name: 'Action Logger', status: 'healthy' as const, lastFired: '2 min ago', detail: '42 records today' },
  { name: 'Outcome Collector', status: 'healthy' as const, lastFired: '15 min ago', detail: '89% coverage' },
  { name: 'Pattern Analyzer', status: 'healthy' as const, lastFired: 'Sunday 11PM', detail: 'Score: 78' },
  { name: 'Prompt Optimizer', status: 'healthy' as const, lastFired: '3 days ago', detail: '1 pending' },
  { name: 'Loop Orchestrator', status: 'healthy' as const, lastFired: 'Today 9AM', detail: 'All clear' },
]

export default function MLOpsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Performance Cards */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Agent Performance
          </h3>
          <div className="space-y-3">
            <GlassCard className="p-5">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <BarChart3 size={32} style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    Agent performance data will appear as agents complete tasks.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Prompt Version Timeline */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Prompt Version Timeline
          </h3>
          <GlassCard className="p-5">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <GitBranch size={32} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  Prompt versions will be tracked here as they are created.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Cost-Quality Chart placeholder */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Cost vs Quality
          </h3>
          <GlassCard className="p-5">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <DollarSign size={32} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  Cost-quality scatter plot will appear with sufficient run data.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Approval Queue */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Approval Queue
          </h3>
          <GlassCard className="p-5">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle2 size={32} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  No pending prompt optimizations to review.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* A/B Test Tracker */}
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          A/B Test Tracker
        </h3>
        <GlassCard className="p-5">
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <Beaker size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                No active A/B tests. Tests will appear when configured via the Loop Orchestrator.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
        </>
      )}
    </div>
  )
}
