'use client'

import { useState } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Loader2,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import LiveIndicator from '@/components/ui/LiveIndicator'

const SYNC_MAPPINGS = [
  { entityType: 'Tasks', mcCollection: 'tasks', notionDb: 'Tasks Database', conflicts: 0 },
  { entityType: 'Blog Posts (HDB)', mcCollection: 'blog_posts', notionDb: 'HDB Content Calendar', conflicts: 0 },
  { entityType: 'Blog Posts (DSpiked)', mcCollection: 'blog_posts', notionDb: 'DSpiked Content Calendar', conflicts: 0 },
  { entityType: 'VA Tasks', mcCollection: 'va_tasks', notionDb: 'VA Board', conflicts: 0 },
  { entityType: 'Projects', mcCollection: 'projects', notionDb: 'Projects Database', conflicts: 0 },
]

export default function NotionSyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [syncInterval, setSyncInterval] = useState('15min')
  const [conflictResolution, setConflictResolution] = useState<'mc' | 'notion' | 'ask'>('ask')

  const handleSyncAll = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 3000)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Notion Sync
          </h2>
          <LiveIndicator status="healthy" label="Connected" />
        </div>
        <button
          className="glass-button-primary glass-button text-sm flex items-center gap-2"
          onClick={handleSyncAll}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {syncing ? 'Syncing...' : 'Sync All Now'}
        </button>
      </div>

      {/* Sync Mappings */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Sync Mappings
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left text-xs py-2 px-3">Entity Type</th>
                <th className="text-left text-xs py-2 px-3">Mission Control</th>
                <th className="text-center text-xs py-2 px-3"></th>
                <th className="text-left text-xs py-2 px-3">Notion Database</th>
                <th className="text-center text-xs py-2 px-3">Last Sync</th>
                <th className="text-center text-xs py-2 px-3">Status</th>
                <th className="text-center text-xs py-2 px-3">Conflicts</th>
              </tr>
            </thead>
            <tbody>
              {SYNC_MAPPINGS.map((mapping) => (
                <tr
                  key={mapping.entityType}
                  className="border-t"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <td className="py-3 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {mapping.entityType}
                  </td>
                  <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {mapping.mcCollection}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
                  </td>
                  <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {mapping.notionDb}
                  </td>
                  <td className="py-3 px-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    Never
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusPill status="idle" size="sm" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className="text-xs"
                      style={{
                        color: mapping.conflicts > 0 ? 'var(--accent-amber)' : 'var(--text-muted)',
                      }}
                    >
                      {mapping.conflicts}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Recent Sync Activity */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Recent Sync Activity
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Clock size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              No sync activity yet. Configure your Notion API token and database IDs to begin.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Auto-sync Settings */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Auto-sync Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
              Sync Interval
            </label>
            <div className="flex gap-2">
              {['5min', '15min', '30min', 'manual'].map((interval) => (
                <button
                  key={interval}
                  className="glass-button text-xs"
                  style={{
                    background:
                      syncInterval === interval ? 'var(--glass-bg-active)' : undefined,
                    borderColor:
                      syncInterval === interval ? 'var(--accent-blue)' : undefined,
                  }}
                  onClick={() => setSyncInterval(interval)}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>
              Conflict Resolution
            </label>
            <div className="flex gap-2">
              {[
                { id: 'mc' as const, label: 'MC Wins' },
                { id: 'notion' as const, label: 'Notion Wins' },
                { id: 'ask' as const, label: 'Ask Me' },
              ].map((option) => (
                <button
                  key={option.id}
                  className="glass-button text-xs"
                  style={{
                    background:
                      conflictResolution === option.id ? 'var(--glass-bg-active)' : undefined,
                    borderColor:
                      conflictResolution === option.id ? 'var(--accent-blue)' : undefined,
                  }}
                  onClick={() => setConflictResolution(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
