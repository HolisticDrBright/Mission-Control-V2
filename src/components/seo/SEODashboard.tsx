'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  FileText,
  TrendingUp,
  BarChart3,
  Globe,
  Sparkles,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'

interface SEODashboardProps {
  siteName: string
  domain: string
  accentColor: string
}

const POST_STATUSES = [
  { id: 'idea', label: 'Idea' },
  { id: 'keyword_research', label: 'Keyword Research' },
  { id: 'outline', label: 'Outline' },
  { id: 'draft', label: 'Draft' },
  { id: 'review', label: 'Review' },
  { id: 'published', label: 'Published' },
]

interface MockKeyword {
  keyword: string
  volume: number
  difficulty: number
  rank: number | null
  target: number
}

export default function SEODashboard({ siteName, domain, accentColor }: SEODashboardProps) {
  const [keywords] = useState<MockKeyword[]>([])
  const [activeView, setActiveView] = useState<'calendar' | 'keywords'>('calendar')

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {siteName} SEO
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {domain}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="glass-button text-sm flex items-center gap-2">
            <Sparkles size={14} />
            Auto-Draft
          </button>
          <button className="glass-button-primary glass-button text-sm flex items-center gap-2">
            <Plus size={14} />
            New Post
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Posts', value: '0', icon: FileText },
          { label: 'Published', value: '0', icon: Globe },
          { label: 'In Draft', value: '0', icon: FileText },
          { label: 'Avg SEO Score', value: '—', icon: BarChart3 },
          { label: 'Est. Monthly Traffic', value: '0', icon: TrendingUp },
        ].map((stat) => (
          <GlassCard key={stat.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon size={13} style={{ color: accentColor }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </span>
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          className="px-4 py-1.5 rounded-lg text-sm transition-all"
          style={{
            background: activeView === 'calendar' ? 'var(--glass-bg-hover)' : 'transparent',
            color: activeView === 'calendar' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
          onClick={() => setActiveView('calendar')}
        >
          Content Calendar
        </button>
        <button
          className="px-4 py-1.5 rounded-lg text-sm transition-all"
          style={{
            background: activeView === 'keywords' ? 'var(--glass-bg-hover)' : 'transparent',
            color: activeView === 'keywords' ? 'var(--text-primary)' : 'var(--text-muted)',
          }}
          onClick={() => setActiveView('keywords')}
        >
          Keyword Tracker
        </button>
      </div>

      {/* Content Calendar */}
      {activeView === 'calendar' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {POST_STATUSES.map((status) => (
            <div key={status.id} className="min-w-[220px] max-w-[260px] flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {status.label}
                </h3>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                >
                  0
                </span>
              </div>
              <div
                className="p-2 rounded-xl min-h-[200px] space-y-2"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  No posts
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keyword Tracker */}
      {activeView === 'keywords' && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Tracked Keywords
            </h3>
            <button className="glass-button text-xs flex items-center gap-1">
              <Plus size={12} />
              Add Keyword
            </button>
          </div>
          {keywords.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Search size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                No keywords tracked yet. Add keywords to monitor rankings.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="text-left text-xs py-2 px-3">Keyword</th>
                    <th className="text-right text-xs py-2 px-3">Volume</th>
                    <th className="text-right text-xs py-2 px-3">Difficulty</th>
                    <th className="text-right text-xs py-2 px-3">Current Rank</th>
                    <th className="text-right text-xs py-2 px-3">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw, i) => (
                    <tr
                      key={i}
                      className="border-t"
                      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                        {kw.keyword}
                      </td>
                      <td className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>
                        {kw.volume.toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-3">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px]"
                          style={{
                            background:
                              kw.difficulty > 70
                                ? 'rgba(244,63,94,0.15)'
                                : kw.difficulty > 40
                                  ? 'rgba(245,158,11,0.15)'
                                  : 'rgba(16,185,129,0.15)',
                            color:
                              kw.difficulty > 70
                                ? 'var(--accent-rose)'
                                : kw.difficulty > 40
                                  ? 'var(--accent-amber)'
                                  : 'var(--accent-emerald)',
                          }}
                        >
                          {kw.difficulty}
                        </span>
                      </td>
                      <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                        {kw.rank ?? '—'}
                      </td>
                      <td className="text-right py-2 px-3" style={{ color: 'var(--text-muted)' }}>
                        {kw.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
