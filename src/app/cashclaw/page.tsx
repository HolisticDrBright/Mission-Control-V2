'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Grab,
  DollarSign,
  CheckCircle2,
  Star,
  TrendingUp,
  Clock,
  XCircle,
  BarChart3,
  Users,
  RefreshCw,
  Activity,
  Wifi,
  Brain,
  Zap,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import LiveIndicator from '@/components/ui/LiveIndicator'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// ── Constants ──────────────────────────────────────────────
const ETH_PRICE_USD = 3500
const PERIOD_OPTIONS = ['7d', '30d', '90d', 'All'] as const
type Period = (typeof PERIOD_OPTIONS)[number]

function daysFromPeriod(p: Period): number | undefined {
  if (p === '7d') return 7
  if (p === '30d') return 30
  if (p === '90d') return 90
  return undefined
}

// ── Types ──────────────────────────────────────────────────
interface DailyEarning {
  date: string
  eth_earned: number
  task_count: number
}

interface CategoryStat {
  category: string
  task_count: number
  avg_earned_eth: number
}

interface HourlyBucket {
  hour: number
  count: number
}

interface SummaryData {
  total_earned_eth: number
  tasks_completed: number
  tasks_declined: number
  tasks_failed: number
  completion_rate: number
  acceptance_rate: number
  revision_rate: number
  return_client_rate: number
  unique_clients: number
  avg_rating: number
  estimated_costs_eth: number
  daily_earnings: DailyEarning[]
  top_categories: CategoryStat[]
  hourly_activity: HourlyBucket[]
  ml_ops: {
    bid_gate_declined: number
    dynamic_pricing_count: number
    ensemble_runs: number
    prompt_version: string
    study_sessions: number
  }
}

interface HeartbeatData {
  online: boolean
  active_tasks: number
  ws_connected: boolean
  total_polls: number
  started_at: string | null
}

interface TaskRow {
  id: string
  description: string
  status: string
  category: string
  earned_eth: number
  rating: number | null
  outcome_score: number | null
  duration_minutes: number | null
  completed_at: string
}

// ── Custom Tooltip ─────────────────────────────────────────
function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-xl"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function CashClawPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [heartbeat, setHeartbeat] = useState<HeartbeatData | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // ── Fetch helpers ──────────────────────────────────────
  const fetchSummary = useCallback(async (p: Period) => {
    try {
      const days = daysFromPeriod(p)
      const q = days ? `?view=summary&days=${days}` : '?view=summary'
      const res = await fetch(`/api/cashclaw${q}`)
      if (!res.ok) throw new Error(`Summary ${res.status}`)
      const data = await res.json()
      setSummary(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const fetchHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/api/cashclaw?view=heartbeat')
      if (!res.ok) throw new Error(`Heartbeat ${res.status}`)
      const data = await res.json()
      setHeartbeat(data)
    } catch {
      setHeartbeat({ online: false, active_tasks: 0, ws_connected: false, total_polls: 0, started_at: null })
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/cashclaw?view=tasks')
      if (!res.ok) throw new Error(`Tasks ${res.status}`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : data.tasks ?? [])
    } catch {
      setTasks([])
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchSummary(period), fetchHeartbeat(), fetchTasks()])
    setLastRefresh(new Date())
    setLoading(false)
  }, [period, fetchSummary, fetchHeartbeat, fetchTasks])

  // initial + period change
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(refreshAll, 30_000)
    return () => clearInterval(id)
  }, [refreshAll])

  // ── Derived values ─────────────────────────────────────
  const s = summary
  const totalEth = s?.total_earned_eth ?? 0
  const netProfit = totalEth - (s?.estimated_costs_eth ?? 0)
  const agentStatus: 'healthy' | 'offline' = heartbeat?.online ? 'healthy' : 'offline'

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── 1. Header + Live Status ─────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            <span className="mr-1">🦀</span> CashClaw
          </h2>
          <LiveIndicator status={agentStatus} label={heartbeat?.online ? 'Online' : 'Offline'} />
        </div>

        <div className="flex items-center gap-4">
          {/* Period selector */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: p === period ? 'var(--accent-emerald)' : 'transparent',
                  color: p === period ? '#000' : 'var(--text-secondary)',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refreshAll}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {lastRefresh && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <GlassCard className="p-4 !border-[rgba(239,68,68,0.3)]" hover={false}>
          <div className="flex items-center gap-3">
            <AlertCircle size={18} style={{ color: 'var(--accent-rose)' }} />
            <p className="text-sm" style={{ color: 'var(--accent-rose)' }}>
              Failed to load data: {error}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Loading state */}
      {loading && !s && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      {/* Show content when we have data or finished loading */}
      {(!loading || s) && (
        <>
          {/* ── 2. Earnings Hero Cards ──────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <HeroCard
              icon={<DollarSign size={18} />}
              label="Total Earned"
              value={`${totalEth.toFixed(4)} ETH`}
              sub={`$${(totalEth * ETH_PRICE_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              color="var(--accent-emerald)"
            />
            <HeroCard
              icon={<CheckCircle2 size={18} />}
              label="Tasks Completed"
              value={String(s?.tasks_completed ?? 0)}
              sub={`${((s?.completion_rate ?? 0) * 100).toFixed(1)}% completion`}
              color="var(--accent-blue)"
            />
            <HeroCard
              icon={<Star size={18} />}
              label="Avg Rating"
              value={`${(s?.avg_rating ?? 0).toFixed(1)} / 5`}
              sub={<StarBar rating={s?.avg_rating ?? 0} />}
              color="var(--accent-amber)"
            />
            <HeroCard
              icon={<TrendingUp size={18} />}
              label="Net Profit"
              value={`${netProfit.toFixed(4)} ETH`}
              sub={`$${(netProfit * ETH_PRICE_USD).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              color={netProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}
            />
          </div>

          {/* ── 3. Earnings Chart ───────────────────────── */}
          <GlassCard hover={false}>
            <h3
              className="text-xs font-medium uppercase tracking-wider mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Earnings Over Time
            </h3>
            {(s?.daily_earnings?.length ?? 0) > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s!.daily_earnings}>
                    <defs>
                      <linearGradient id="ethGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-emerald)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--accent-emerald)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="eth_earned"
                      name="ETH Earned"
                      stroke="var(--accent-emerald)"
                      strokeWidth={2}
                      fill="url(#ethGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={<BarChart3 size={32} />} text="No earnings data yet." />
            )}
          </GlassCard>

          {/* ── 4. Task Pipeline Stats ──────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <MiniStat label="Completed" value={s?.tasks_completed ?? 0} color="var(--accent-emerald)" />
            <MiniStat label="Declined" value={s?.tasks_declined ?? 0} color="var(--text-muted)" />
            <MiniStat label="Failed" value={s?.tasks_failed ?? 0} color="var(--accent-rose)" />
            <MiniStat
              label="Acceptance"
              value={`${((s?.acceptance_rate ?? 0) * 100).toFixed(1)}%`}
              color="var(--accent-blue)"
            />
            <MiniStat
              label="Revision Rate"
              value={`${((s?.revision_rate ?? 0) * 100).toFixed(1)}%`}
              color="var(--accent-amber)"
            />
            <MiniStat
              label="Return Clients"
              value={`${((s?.return_client_rate ?? 0) * 100).toFixed(1)}%`}
              color="var(--accent-purple)"
            />
            <MiniStat label="Unique Clients" value={s?.unique_clients ?? 0} color="var(--accent-cyan)" />
          </div>

          {/* ── 5 + 6. Categories + Hourly Activity ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Categories */}
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Top Categories
              </h3>
              <GlassCard hover={false}>
                {(s?.top_categories?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {s!.top_categories.map((cat) => {
                      const maxCount = Math.max(...s!.top_categories.map((c) => c.task_count))
                      const pct = maxCount > 0 ? (cat.task_count / maxCount) * 100 : 0
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                              {cat.category}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {cat.task_count} tasks &middot; {cat.avg_earned_eth.toFixed(4)} ETH avg
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'var(--glass-border)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: 'var(--accent-emerald)',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState icon={<BarChart3 size={28} />} text="No category data yet." />
                )}
              </GlassCard>
            </div>

            {/* Hourly Activity Heatmap */}
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Hourly Activity
              </h3>
              <GlassCard hover={false}>
                {(s?.hourly_activity?.length ?? 0) > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={s!.hourly_activity}>
                        <XAxis
                          dataKey="hour"
                          tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(h: number) => `${h}h`}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                        />
                        <Tooltip content={<GlassTooltip />} />
                        <Bar dataKey="count" name="Tasks" radius={[3, 3, 0, 0]} fill="var(--accent-cyan)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={<Clock size={28} />} text="No activity data yet." />
                )}
              </GlassCard>
            </div>
          </div>

          {/* ── 7. Recent Tasks Table ───────────────────── */}
          <div>
            <h3
              className="text-xs font-medium uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Recent Tasks
            </h3>
            <GlassCard hover={false} className="overflow-x-auto">
              {tasks.length > 0 ? (
                <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
                  <thead>
                    <tr
                      className="text-left border-b"
                      style={{ borderColor: 'var(--glass-border)', color: 'var(--text-muted)' }}
                    >
                      <th className="pb-2 pr-3 font-medium w-6" />
                      <th className="pb-2 pr-3 font-medium">Task</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Category</th>
                      <th className="pb-2 pr-3 font-medium text-right">ETH</th>
                      <th className="pb-2 pr-3 font-medium text-right">Rating</th>
                      <th className="pb-2 pr-3 font-medium text-right">Score</th>
                      <th className="pb-2 pr-3 font-medium text-right">Duration</th>
                      <th className="pb-2 font-medium text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const isExpanded = expandedTask === task.id
                      return (
                        <>
                          <tr
                            key={task.id}
                            className="border-b cursor-pointer transition-colors hover:opacity-80"
                            style={{ borderColor: 'var(--glass-border)' }}
                            onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                          >
                            <td className="py-2 pr-1">
                              {isExpanded ? (
                                <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
                              ) : (
                                <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />
                              )}
                            </td>
                            <td className="py-2 pr-3 max-w-[200px] truncate">{task.description}</td>
                            <td className="py-2 pr-3">
                              <StatusPill status={task.status} size="sm" />
                            </td>
                            <td className="py-2 pr-3" style={{ color: 'var(--text-secondary)' }}>
                              {task.category}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono">{task.earned_eth.toFixed(4)}</td>
                            <td className="py-2 pr-3 text-right">
                              {task.rating != null ? `${task.rating}/5` : '-'}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {task.outcome_score != null ? task.outcome_score.toFixed(2) : '-'}
                            </td>
                            <td className="py-2 pr-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                              {task.duration_minutes != null ? `${task.duration_minutes}m` : '-'}
                            </td>
                            <td className="py-2 text-right" style={{ color: 'var(--text-muted)' }}>
                              {new Date(task.completed_at).toLocaleDateString()}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${task.id}-detail`}>
                              <td colSpan={9} className="py-3 px-4">
                                <div
                                  className="rounded-lg p-3 text-xs"
                                  style={{
                                    background: 'var(--glass-bg)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  <p className="mb-1">
                                    <strong style={{ color: 'var(--text-primary)' }}>Full Description:</strong>{' '}
                                    {task.description}
                                  </p>
                                  <p>
                                    <strong style={{ color: 'var(--text-primary)' }}>ID:</strong> {task.id}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <EmptyState icon={<FileText size={28} />} text="No tasks recorded yet." />
              )}
            </GlassCard>
          </div>

          {/* ── 8. ML Ops Panel ─────────────────────────── */}
          <div>
            <h3
              className="text-xs font-medium uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              ML Ops
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MlOpCard
                icon={<Zap size={16} />}
                label="Bid Gate Declined"
                value={s?.ml_ops?.bid_gate_declined ?? 0}
              />
              <MlOpCard
                icon={<DollarSign size={16} />}
                label="Dynamic Pricing"
                value={s?.ml_ops?.dynamic_pricing_count ?? 0}
              />
              <MlOpCard
                icon={<Brain size={16} />}
                label="Ensemble Runs"
                value={s?.ml_ops?.ensemble_runs ?? 0}
              />
              <MlOpCard
                icon={<FileText size={16} />}
                label="Prompt Version"
                value={s?.ml_ops?.prompt_version ?? '-'}
              />
              <MlOpCard
                icon={<BookOpen size={16} />}
                label="Study Sessions"
                value={s?.ml_ops?.study_sessions ?? 0}
              />
            </div>
          </div>

          {/* ── 9. Agent Heartbeat Status ───────────────── */}
          {heartbeat && (
            <div>
              <h3
                className="text-xs font-medium uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-secondary)' }}
              >
                Agent Heartbeat
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} style={{ color: 'var(--accent-blue)' }} />
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                      Active Tasks
                    </span>
                  </div>
                  <p className="text-lg font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {heartbeat.active_tasks}
                  </p>
                </GlassCard>

                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-1">
                    <Wifi size={14} style={{ color: heartbeat.ws_connected ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                      WebSocket
                    </span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: heartbeat.ws_connected ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {heartbeat.ws_connected ? 'Connected' : 'Disconnected'}
                  </p>
                </GlassCard>

                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={14} style={{ color: 'var(--accent-cyan)' }} />
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                      Total Polls
                    </span>
                  </div>
                  <p className="text-lg font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                    {heartbeat.total_polls.toLocaleString()}
                  </p>
                </GlassCard>

                <GlassCard hover={false}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} style={{ color: 'var(--accent-purple)' }} />
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>
                      Uptime Since
                    </span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {heartbeat.started_at
                      ? new Date(heartbeat.started_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </GlassCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function HeroCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: React.ReactNode
  color: string
}) {
  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <p className="text-xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
        {sub}
      </div>
    </GlassCard>
  )
}

function StarBar({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={10}
          fill={i <= Math.round(rating) ? 'var(--accent-amber)' : 'transparent'}
          stroke="var(--accent-amber)"
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <GlassCard hover={false} className="text-center">
      <p className="text-lg font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </GlassCard>
  )
}

function MlOpCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <GlassCard hover={false}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: 'var(--accent-purple)' }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </GlassCard>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
        {text}
      </p>
    </div>
  )
}
