'use client'

import { useState } from 'react'
import {
  Bot,
  Plus,
  Download,
  Cpu,
  DollarSign,
  Activity,
  Clock,
  BookOpen,
} from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import AgentAvatar from '@/components/ui/AgentAvatar'
import CostBadge from '@/components/ui/CostBadge'

const ROLE_COLORS: Record<string, string> = {
  developer: 'var(--accent-blue)',
  researcher: 'var(--accent-purple)',
  marketer: 'var(--accent-rose)',
  analyst: 'var(--accent-cyan)',
  content: 'var(--accent-emerald)',
  va: 'var(--accent-amber)',
  custom: 'var(--text-secondary)',
}

export default function AgentsPage() {
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const [showSkills, setShowSkills] = useState(false)

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Agent Fleet
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-md"
            style={{
              background: 'rgba(16,185,129,0.15)',
              color: 'var(--accent-emerald)',
            }}
          >
            {agents.filter((a) => a.status === 'running').length} active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="glass-button text-sm flex items-center gap-2"
            onClick={() => setShowSkills(!showSkills)}
          >
            <BookOpen size={14} />
            Skills Library
          </button>
          <button className="glass-button text-sm flex items-center gap-2">
            <Download size={14} />
            Import from OpenClaw
          </button>
          <button className="glass-button-primary glass-button text-sm flex items-center gap-2">
            <Plus size={14} />
            New Agent
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Agent Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.length === 0 ? (
              <GlassCard className="p-8 col-span-full flex flex-col items-center justify-center">
                <Bot size={40} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                  No agents yet. Create one or import from OpenClaw.
                </p>
              </GlassCard>
            ) : (
              agents.map((agent) => {
                const currentTask = tasks.find((t) => t.id === agent.current_task_id)
                const roleColor = ROLE_COLORS[agent.role] || ROLE_COLORS.custom

                return (
                  <GlassCard key={agent.id} className="p-5 cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <AgentAvatar
                          name={agent.name}
                          role={agent.role}
                          status={agent.status}
                          size="md"
                        />
                        <div>
                          <h3
                            className="text-sm font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {agent.name}
                          </h3>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ background: `${roleColor}22`, color: roleColor }}
                          >
                            {agent.role}
                          </span>
                        </div>
                      </div>
                      <StatusPill status={agent.status} size="sm" />
                    </div>

                    {/* Model */}
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu size={12} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {agent.model}
                      </span>
                    </div>

                    {/* Current Task */}
                    {currentTask && (
                      <div
                        className="p-2 rounded-lg mb-3 text-xs"
                        style={{
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.15)',
                          color: 'var(--accent-emerald)',
                        }}
                      >
                        Working on: {currentTask.title}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                      <div className="flex items-center gap-1">
                        <Activity size={11} />
                        {agent.total_runs} runs
                      </div>
                      <CostBadge amount={agent.total_cost_usd || 0} size="sm" />
                      {agent.avg_outcome_score !== null && agent.avg_outcome_score !== undefined && (
                        <span>Score: {agent.avg_outcome_score}</span>
                      )}
                    </div>

                    {/* Heartbeat */}
                    {agent.heartbeat_at && (
                      <div className="flex items-center gap-1 mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={10} />
                        Last heartbeat:{' '}
                        {new Date(agent.heartbeat_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </GlassCard>
                )
              })
            )}
          </div>
        </div>

        {/* Skills Library Panel */}
        {showSkills && (
          <div className="w-80 shrink-0">
            <GlassCard className="p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Skills Library
                </h3>
                <button className="glass-button text-xs">
                  <Plus size={12} />
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Reusable knowledge modules for agents. Create skills and assign them to
                multiple agents.
              </p>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
