'use client'

import { useEffect, useState } from 'react'
import { useDashboardData } from '@/lib/hooks/use-data'
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

function MissionControlSystems() {
  const [mcData, setMcData] = useState<{
    seo: Record<string, unknown> | null
    outreach: Record<string, unknown> | null
    alerts: Array<{ id: string; system: string; severity: string; issue: string; timestamp: string }>
    quick_stats: { articles_today: number; signals_today: number; hot_leads: number; pending_replies: number }
  } | null>(null)
  const [budget, setBudget] = useState<{
    seo: number; outreach: number; cron: number; total: number; remaining: number; budget: number; percent_used: number
  } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/mission-state').then(r => r.ok ? r.json() : null),
      fetch('/api/mission-state?section=budget').then(r => r.ok ? r.json() : null),
    ]).then(([stateRes, budgetRes]) => {
      if (stateRes?.data) setMcData(stateRes.data)
      if (budgetRes?.data) setBudget(budgetRes.data)
    }).catch(() => {})
  }, [])

  const stats = mcData?.quick_stats
  const alerts = mcData?.alerts || []
  const unackedAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning')

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {unackedAlerts.length > 0 && (
        <GlassCard className="p-4 !border-[rgba(244,63,94,0.3)]" hover={false}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)' }}>
              <DollarSign size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--accent-rose)' }}>
                {unackedAlerts.length} Active Alert{unackedAlerts.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {unackedAlerts[0]?.issue}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Autonomous Systems
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* SEO System */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' }}>
                <TrendingUp size={14} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>SEO</span>
            </div>
            <div className="w-2 h-2 rounded-full status-pulse" style={{ background: 'var(--status-running)' }} />
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {stats?.articles_today ?? 0}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>articles today</p>
        </GlassCard>

        {/* Outreach System */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' }}>
                <ListChecks size={14} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Outreach</span>
            </div>
            <div className="w-2 h-2 rounded-full status-pulse" style={{ background: 'var(--status-running)' }} />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {stats?.signals_today ?? 0}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>signals today</p>
            </div>
            {(stats?.hot_leads ?? 0) > 0 && (
              <div className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)' }}>
                {stats?.hot_leads} HOT
              </div>
            )}
          </div>
        </GlassCard>

        {/* Budget */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' }}>
                <DollarSign size={14} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Budget</span>
            </div>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            ${budget?.total?.toFixed(2) ?? '0.00'}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            of ${budget?.budget?.toFixed(2) ?? '15.00'} daily ({budget?.percent_used ?? 0}%)
          </p>
          {budget && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(budget.percent_used, 100)}%`,
                background: budget.percent_used > 80 ? 'var(--accent-rose)' : budget.percent_used > 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
              }} />
            </div>
          )}
        </GlassCard>

        {/* Replies Pending */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)' }}>
                <Bot size={14} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Replies</span>
            </div>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {stats?.pending_replies ?? 0}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>pending action</p>
        </GlassCard>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  useDashboardData()
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

      {/* Mission Control Systems */}
      <MissionControlSystems />

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
