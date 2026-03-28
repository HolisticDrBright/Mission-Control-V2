'use client'

import { useState } from 'react'
import {
  Calendar,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'

const JOB_TYPE_COLORS: Record<string, string> = {
  reporting: 'var(--accent-blue)',
  monitoring: 'var(--accent-cyan)',
  content: 'var(--accent-emerald)',
  outreach: 'var(--accent-purple)',
  maintenance: 'var(--accent-amber)',
  ml_ops: 'var(--accent-rose)',
}

export default function SchedulerPage() {
  const jobs = useStore((s) => s.scheduledJobs)

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ML Ops System Health */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          ML Ops System Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {['Action Logger', 'Outcome Collector', 'Pattern Analyzer', 'Prompt Optimizer', 'Loop Orchestrator'].map(
            (name) => (
              <GlassCard key={name} className="p-3 text-center">
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {name}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--status-running)' }}
                  />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Healthy
                  </span>
                </div>
              </GlassCard>
            )
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Scheduled Jobs
        </h2>
        <button className="glass-button-primary glass-button text-sm flex items-center gap-2">
          <Plus size={14} />
          Create Job
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <GlassCard className="p-8 flex flex-col items-center justify-center">
            <Calendar size={40} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
              No scheduled jobs. Create one to automate recurring tasks.
            </p>
          </GlassCard>
        ) : (
          jobs.map((job) => {
            const typeColor = JOB_TYPE_COLORS[job.job_type] || 'var(--text-secondary)'
            return (
              <GlassCard key={job.id} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${typeColor}22`, color: typeColor }}
                    >
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {job.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md"
                          style={{ background: `${typeColor}22`, color: typeColor }}
                        >
                          {job.job_type}
                        </span>
                        <span
                          className="text-xs font-mono"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {job.cron_expression}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <Clock size={11} />
                        Next:{' '}
                        {job.next_run_at
                          ? new Date(job.next_run_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{job.run_count} runs</span>
                        {job.fail_count > 0 && (
                          <span style={{ color: 'var(--accent-rose)' }}>
                            {job.fail_count} failures
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        className="glass-button p-2"
                        title="Run Now"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        className="glass-button p-2"
                        title={job.enabled ? 'Disable' : 'Enable'}
                      >
                        {job.enabled ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </div>

                    {job.last_run_status && (
                      <div>
                        {job.last_run_status === 'success' ? (
                          <CheckCircle2 size={16} style={{ color: 'var(--accent-emerald)' }} />
                        ) : (
                          <XCircle size={16} style={{ color: 'var(--accent-rose)' }} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })
        )}
      </div>
    </div>
  )
}
