'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Server,
  Clock,
  Wifi,
  RefreshCw,
  ThermometerSun,
  Gauge,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import LiveIndicator from '@/components/ui/LiveIndicator'

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical'
  timestamp: string
  uptime_seconds: number
  uptime_formatted: string
  hostname: string
  platform: string
  arch: string
  node_version: string
  cpu: {
    model: string
    cores: number
    usage_percent: number
    per_core: number[]
  }
  memory: {
    total_gb: number
    used_gb: number
    free_gb: number
    usage_percent: number
  }
  disk: {
    mount: string
    total_gb: number
    used_gb: number
    free_gb: number
    usage_percent: number
  }[]
  load_average: {
    one_min: number
    five_min: number
    fifteen_min: number
  }
  process_memory: {
    rss_mb: number
    heap_used_mb: number
    heap_total_mb: number
    external_mb: number
  }
  network: {
    name: string
    address: string
    mac: string
  }[]
  top_processes: {
    pid: string
    cpu: string
    mem: string
    command: string
  }[]
}

function UsageBar({
  percent,
  color,
  height = 8,
}: {
  percent: number
  color: string
  height?: number
}) {
  const barColor =
    percent > 90
      ? 'var(--accent-rose)'
      : percent > 75
        ? 'var(--accent-amber)'
        : color

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(percent, 100)}%`, background: barColor }}
      />
    </div>
  )
}

function UsageRing({
  percent,
  size = 100,
  strokeWidth = 8,
  color,
  label,
  sublabel,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  color: string
  label: string
  sublabel?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  const ringColor =
    percent > 90
      ? 'var(--accent-rose)'
      : percent > 75
        ? 'var(--accent-amber)'
        : color

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {percent}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {sublabel}
          </p>
        )}
      </div>
    </div>
  )
}

function CoreBar({ index, percent }: { index: number; percent: number }) {
  const color =
    percent > 90
      ? 'var(--accent-rose)'
      : percent > 75
        ? 'var(--accent-amber)'
        : 'var(--accent-cyan)'

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono w-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
        {index}
      </span>
      <div className="flex-1">
        <UsageBar percent={percent} color={color} height={6} />
      </div>
      <span className="text-[10px] font-mono w-8 text-right" style={{ color: 'var(--text-secondary)' }}>
        {percent}%
      </span>
    </div>
  )
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/system-health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setHealth(json.data)
      setError(null)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchHealth])

  if (loading && !health) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading system health...</p>
        </div>
      </div>
    )
  }

  if (error && !health) {
    return (
      <div className="p-6">
        <GlassCard className="p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--accent-rose)' }}>Error: {error}</p>
          <button className="glass-button text-sm mt-4" onClick={fetchHealth}>
            Retry
          </button>
        </GlassCard>
      </div>
    )
  }

  if (!health) return null

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            System Health
          </h2>
          <LiveIndicator status={health.status} label={health.status} />
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`glass-button text-xs flex items-center gap-1.5 ${autoRefresh ? 'glass-button-primary' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity size={12} />
            {autoRefresh ? 'Live (5s)' : 'Paused'}
          </button>
          <button
            className="glass-button text-xs flex items-center gap-1.5"
            onClick={fetchHealth}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          {lastRefresh && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Last: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* System Info Banner */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex flex-wrap items-center gap-6 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-1.5">
            <Server size={12} style={{ color: 'var(--accent-blue)' }} />
            {health.hostname}
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu size={12} style={{ color: 'var(--accent-cyan)' }} />
            {health.platform}/{health.arch}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} style={{ color: 'var(--accent-purple)' }} />
            Uptime: {health.uptime_formatted}
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            Node {health.node_version}
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            CPU: {health.cpu.model.substring(0, 40)}
          </div>
        </div>
      </GlassCard>

      {/* Main Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-5 flex flex-col items-center justify-center">
          <UsageRing
            percent={health.cpu.usage_percent}
            color="var(--accent-cyan)"
            label="CPU"
            sublabel={`${health.cpu.cores} cores`}
          />
        </GlassCard>

        <GlassCard className="p-5 flex flex-col items-center justify-center">
          <UsageRing
            percent={health.memory.usage_percent}
            color="var(--accent-purple)"
            label="Memory"
            sublabel={`${health.memory.used_gb} / ${health.memory.total_gb} GB`}
          />
        </GlassCard>

        <GlassCard className="p-5 flex flex-col items-center justify-center">
          <UsageRing
            percent={health.disk[0]?.usage_percent || 0}
            color="var(--accent-emerald)"
            label="Disk"
            sublabel={`${health.disk[0]?.used_gb || 0} / ${health.disk[0]?.total_gb || 0} GB`}
          />
        </GlassCard>

        <GlassCard className="p-5 flex flex-col items-center justify-center">
          <UsageRing
            percent={Math.min(
              Math.round((health.load_average.one_min / health.cpu.cores) * 100),
              100
            )}
            color="var(--accent-amber)"
            label="Load"
            sublabel={`${health.load_average.one_min} / ${health.load_average.five_min} / ${health.load_average.fifteen_min}`}
          />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Per-Core */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={14} style={{ color: 'var(--accent-cyan)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              CPU Cores
            </h3>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
              Avg: {health.cpu.usage_percent}%
            </span>
          </div>
          <div className="space-y-1.5">
            {health.cpu.per_core.map((percent, i) => (
              <CoreBar key={i} index={i} percent={percent} />
            ))}
          </div>
        </GlassCard>

        {/* Memory Breakdown */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MemoryStick size={14} style={{ color: 'var(--accent-purple)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Memory
            </h3>
          </div>

          <div className="space-y-4">
            {/* System Memory */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>System RAM</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  {health.memory.used_gb} / {health.memory.total_gb} GB
                </span>
              </div>
              <UsageBar percent={health.memory.usage_percent} color="var(--accent-purple)" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Free: {health.memory.free_gb} GB
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {health.memory.usage_percent}% used
                </span>
              </div>
            </div>

            {/* Process Memory (Next.js) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Next.js Process (RSS)</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  {health.process_memory.rss_mb} MB
                </span>
              </div>
              <UsageBar
                percent={Math.round((health.process_memory.rss_mb / (health.memory.total_gb * 1024)) * 100)}
                color="var(--accent-blue)"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>V8 Heap</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  {health.process_memory.heap_used_mb} / {health.process_memory.heap_total_mb} MB
                </span>
              </div>
              <UsageBar
                percent={Math.round((health.process_memory.heap_used_mb / health.process_memory.heap_total_mb) * 100)}
                color="var(--accent-cyan)"
              />
            </div>
          </div>
        </GlassCard>

        {/* Disk Usage */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={14} style={{ color: 'var(--accent-emerald)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Disk
            </h3>
          </div>
          <div className="space-y-3">
            {health.disk.map((d, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {d.mount}
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                    {d.used_gb} / {d.total_gb} GB
                  </span>
                </div>
                <UsageBar percent={d.usage_percent} color="var(--accent-emerald)" />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {d.free_gb} GB free ({d.usage_percent}% used)
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Network */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wifi size={14} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Network Interfaces
            </h3>
          </div>
          <div className="space-y-2">
            {health.network.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No external network interfaces detected
              </p>
            ) : (
              health.network.map((iface, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {iface.name}
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      MAC: {iface.mac}
                    </p>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--accent-blue)' }}>
                    {iface.address}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {/* Top Processes */}
      {health.top_processes.length > 0 && (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ThermometerSun size={14} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Top Processes (by CPU)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="text-left py-1.5 px-2">PID</th>
                  <th className="text-right py-1.5 px-2">CPU %</th>
                  <th className="text-right py-1.5 px-2">MEM %</th>
                  <th className="text-left py-1.5 px-2">Command</th>
                </tr>
              </thead>
              <tbody>
                {health.top_processes.map((proc, i) => (
                  <tr
                    key={i}
                    className="border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <td className="py-1.5 px-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {proc.pid}
                    </td>
                    <td className="text-right py-1.5 px-2 font-mono" style={{
                      color: parseFloat(proc.cpu) > 50
                        ? 'var(--accent-rose)'
                        : parseFloat(proc.cpu) > 20
                          ? 'var(--accent-amber)'
                          : 'var(--text-primary)',
                    }}>
                      {proc.cpu}%
                    </td>
                    <td className="text-right py-1.5 px-2 font-mono" style={{
                      color: parseFloat(proc.mem) > 50
                        ? 'var(--accent-rose)'
                        : parseFloat(proc.mem) > 20
                          ? 'var(--accent-amber)'
                          : 'var(--text-primary)',
                    }}>
                      {proc.mem}%
                    </td>
                    <td className="py-1.5 px-2 font-mono truncate max-w-[300px]" style={{ color: 'var(--text-secondary)' }}>
                      {proc.command}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Load Average Details */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={14} style={{ color: 'var(--accent-amber)' }} />
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Load Average
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '1 min', value: health.load_average.one_min },
            { label: '5 min', value: health.load_average.five_min },
            { label: '15 min', value: health.load_average.fifteen_min },
          ].map((item) => {
            const loadPercent = Math.round((item.value / health.cpu.cores) * 100)
            return (
              <div key={item.label} className="text-center">
                <p className="text-2xl font-semibold font-mono" style={{
                  color: loadPercent > 100
                    ? 'var(--accent-rose)'
                    : loadPercent > 70
                      ? 'var(--accent-amber)'
                      : 'var(--text-primary)',
                }}>
                  {item.value}
                </p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {item.label} ({loadPercent}% of {health.cpu.cores} cores)
                </p>
              </div>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}
