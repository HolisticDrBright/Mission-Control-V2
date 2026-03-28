'use client'

import { useEffect, useState } from 'react'
import {
  Bot,
  ListChecks,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Zap,
  Video,
  FolderPlus,
} from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import AgentAvatar from '@/components/ui/AgentAvatar'
import CostBadge from '@/components/ui/CostBadge'

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaDirection,
  accentColor,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  delta?: string
  deltaDirection?: 'up' | 'down' | 'flat'
  accentColor: string
}) {
  return (
    <GlassCard className="p-5 flex items-start gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accentColor}22`, color: accentColor }}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <p className="text-2xl font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        {delta && (
          <p
            className="text-xs mt-1 flex items-center gap-1"
            style={{
              color:
                deltaDirection === 'up'
                  ? 'var(--accent-emerald)'
                  : deltaDirection === 'down'
                    ? 'var(--accent-rose)'
                    : 'var(--text-muted)',
            }}
          >
            {deltaDirection === 'up' ? (
              <TrendingUp size={12} />
            ) : deltaDirection === 'down' ? (
              <TrendingDown size={12} />
            ) : null}
            {delta}
          </p>
        )}
      </div>
    </GlassCard>
  )
}

function ActiveTasksList() {
  const tasks = useStore((s) => s.tasks)
  const agents = useStore((s) => s.agents)
  const activeTasks = tasks.filter(
    (t) => t.kanban_status === 'in_progress' || t.kanban_status === 'review'
  )

  return (
    <GlassCard className="p-5 flex flex-col h-full">
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
        Active Tasks
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {activeTasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No active tasks
          </p>
        ) : (
          activeTasks.map((task) => {
            const agent = agents.find((a) => a.id === task.agent_id)
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {agent && (
                  <AgentAvatar
                    name={agent.name}
                    role={agent.role}
                    status={agent.status}
                    size="sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {agent?.name || 'Unassigned'}
                  </p>
                </div>
                <StatusPill status={task.kanban_status} size="sm" />
              </div>
            )
          })
        )}
      </div>
    </GlassCard>
  )
}

function UpcomingJobs() {
  const jobs = useStore((s) => s.scheduledJobs)
  const upcoming = jobs
    .filter((j) => j.enabled && j.next_run_at)
    .sort(
      (a, b) =>
        new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime()
    )
    .slice(0, 8)

  return (
    <GlassCard className="p-5 flex flex-col h-full">
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
        Next Scheduled Runs
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No upcoming jobs
          </p>
        ) : (
          upcoming.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {job.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {job.cron_expression}
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {job.next_run_at
                  ? new Date(job.next_run_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}

function RecentCompletions() {
  const tasks = useStore((s) => s.tasks)
  const completed = tasks
    .filter((t) => t.kanban_status === 'done' && t.completed_at)
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
    )
    .slice(0, 10)

  return (
    <GlassCard className="p-5 flex flex-col h-full">
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
        Recent Completions
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {completed.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No recent completions
          </p>
        ) : (
          completed.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {task.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {task.completed_at
                    ? new Date(task.completed_at).toLocaleDateString()
                    : ''}
                </p>
              </div>
              {task.outcome_score !== null && task.outcome_score !== undefined && (
                <div
                  className="text-xs font-mono px-2 py-1 rounded-lg"
                  style={{
                    background:
                      task.outcome_score >= 80
                        ? 'rgba(16,185,129,0.15)'
                        : task.outcome_score >= 50
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(244,63,94,0.15)',
                    color:
                      task.outcome_score >= 80
                        ? 'var(--accent-emerald)'
                        : task.outcome_score >= 50
                          ? 'var(--accent-amber)'
                          : 'var(--accent-rose)',
                  }}
                >
                  {task.outcome_score}/100
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { label: 'New Project', icon: FolderPlus, color: 'var(--accent-blue)' },
        { label: 'New Task', icon: Plus, color: 'var(--accent-emerald)' },
        { label: 'Schedule Job', icon: Calendar, color: 'var(--accent-purple)' },
        { label: 'New Reel', icon: Video, color: 'var(--accent-rose)' },
      ].map((action) => (
        <button
          key={action.label}
          className="glass-button flex items-center gap-2 text-sm"
          style={{ color: action.color }}
        >
          <action.icon size={16} />
          {action.label}
        </button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const agents = useStore((s) => s.agents)
  const tasks = useStore((s) => s.tasks)
  const jobs = useStore((s) => s.scheduledJobs)

  const activeAgents = agents.filter((a) => a.status === 'running').length
  const inProgressTasks = tasks.filter(
    (t) => t.kanban_status === 'in_progress'
  ).length
  const todayJobs = jobs.filter((j) => {
    if (!j.next_run_at) return false
    const next = new Date(j.next_run_at)
    const today = new Date()
    return next.toDateString() === today.toDateString()
  }).length
  const monthlySpend = agents.reduce((sum, a) => sum + (a.total_cost_usd || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Bot}
          label="Active Agents"
          value={activeAgents}
          accentColor="var(--accent-cyan)"
        />
        <MetricCard
          icon={ListChecks}
          label="Tasks In Progress"
          value={inProgressTasks}
          accentColor="var(--accent-emerald)"
        />
        <MetricCard
          icon={Calendar}
          label="Scheduled Today"
          value={todayJobs}
          accentColor="var(--accent-purple)"
        />
        <MetricCard
          icon={DollarSign}
          label="Monthly AI Spend"
          value={`$${monthlySpend.toFixed(2)}`}
          delta="vs last month"
          deltaDirection="flat"
          accentColor="var(--accent-amber)"
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 360 }}>
        <ActiveTasksList />
        <UpcomingJobs />
        <RecentCompletions />
      </div>

      {/* Quick Actions */}
      <div>
        <h3
          className="text-sm font-medium mb-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          Quick Actions
        </h3>
        <QuickActions />
      </div>
    </div>
  )
}
