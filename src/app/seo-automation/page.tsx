'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, FileText, Search, Globe, BarChart3, RefreshCw, ExternalLink,
  Clock, Zap, PenTool, Upload, CheckCircle2, AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlogPost {
  id: string
  title: string
  slug: string | null
  status: string
  target_keyword: string | null
  meta_description: string | null
  word_count: number | null
  seo_score: number | null
  published_url: string | null
  published_at: string | null
  created_at: string
}

interface Keyword {
  id: string
  keyword: string
  search_volume: number | null
  difficulty: number | null
  current_rank: number | null
  target_rank: number | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    published: { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' },
    draft: { bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' },
    idea: { bg: 'rgba(139,92,246,0.15)', color: 'var(--accent-purple)' },
    outline: { bg: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' },
    review: { bg: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' },
  }
  const c = colors[status] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function DifficultyBadge({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const color = value > 70 ? 'var(--accent-rose)' : value > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
  const label = value > 70 ? 'Hard' : value > 40 ? 'Medium' : 'Easy'
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      {value} · {label}
    </span>
  )
}

function ScoreMeter({ score }: { score: number | null }) {
  if (!score) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const color = score >= 80 ? 'var(--accent-emerald)' : score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score}</span>
    </div>
  )
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SEOAutomationPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'overview' | 'posts' | 'keywords' | 'pipeline'>('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/seo')
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      setPosts(Array.isArray(json.data?.blog_posts) ? json.data.blog_posts : [])
      setKeywords(Array.isArray(json.data?.keywords) ? json.data.keywords : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Stats
  const stats = useMemo(() => {
    const published = posts.filter(p => p.status === 'published')
    const drafts = posts.filter(p => p.status === 'draft')
    const ideas = posts.filter(p => p.status === 'idea')
    const inReview = posts.filter(p => p.status === 'review' || p.status === 'outline')
    const totalWords = posts.reduce((s, p) => s + (p.word_count || 0), 0)
    const scores = posts.map(p => p.seo_score).filter((s): s is number => s !== null && s > 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const avgWords = published.length > 0 ? Math.round(totalWords / published.length) : 0
    const latest = published.sort((a, b) => new Date(b.published_at || '').getTime() - new Date(a.published_at || '').getTime())[0]

    return { total: posts.length, published: published.length, drafts: drafts.length, ideas: ideas.length, inReview: inReview.length, totalWords, avgScore, avgWords, latest }
  }, [posts])

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>SEO Automation</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse"><div className="h-3 w-20 rounded bg-white/5 mb-3" /><div className="h-8 w-16 rounded bg-white/5" /></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>SEO Automation</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Content pipeline &middot; {stats.total} articles &middot; {keywords.length} keywords</p>
          </div>
        </div>
        <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Pipeline Phase Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} style={{ color: 'var(--accent-purple)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Ideas</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.ideas}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Awaiting research</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <PenTool size={14} style={{ color: 'var(--accent-amber)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Drafts</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.drafts}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Being written</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search size={14} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>In Review</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.inReview}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>QA / editing</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Published</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.published}</p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Live on site</p>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Articles', value: String(stats.total), icon: FileText, color: 'var(--accent-blue)' },
          { label: 'Total Words', value: stats.totalWords.toLocaleString(), icon: BarChart3, color: 'var(--accent-purple)' },
          { label: 'Avg Words/Post', value: String(stats.avgWords), icon: FileText, color: 'var(--accent-cyan)' },
          { label: 'Avg SEO Score', value: stats.avgScore ? String(stats.avgScore) : '—', icon: TrendingUp, color: 'var(--accent-emerald)' },
          { label: 'Keywords Tracked', value: String(keywords.length), icon: Search, color: 'var(--accent-amber)' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={12} style={{ color: s.color }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Latest published */}
      {stats.latest && (
        <div className="glass-card p-4 flex items-center gap-3" style={{ borderLeft: '3px solid var(--accent-emerald)' }}>
          <Upload size={14} style={{ color: 'var(--accent-emerald)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest published</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{stats.latest.title}</p>
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(stats.latest.published_at)}</span>
          {stats.latest.published_url && (
            <a href={stats.latest.published_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <ExternalLink size={14} style={{ color: 'var(--accent-blue)' }} />
            </a>
          )}
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['overview', 'posts', 'keywords', 'pipeline'] as const).map(v => (
          <button key={v} className="px-4 py-1.5 rounded-lg text-sm capitalize" style={{ background: view === v ? 'var(--glass-bg-hover)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView(v)}>
            {v === 'overview' ? 'Overview' : v === 'posts' ? `Articles (${posts.length})` : v === 'keywords' ? `Keywords (${keywords.length})` : 'Pipeline'}
          </button>
        ))}
      </div>

      {/* OVERVIEW — Recent articles */}
      {view === 'overview' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Recent Articles</h3>
          <div className="glass-card p-5">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Title</th>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                  <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Words</th>
                  <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>SEO Score</th>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Published</th>
                </tr>
              </thead>
              <tbody>
                {posts.slice(0, 15).map(p => (
                  <tr key={p.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <td className="py-2.5 px-3 max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
                        {p.published_url && <a href={p.published_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} style={{ color: 'var(--accent-blue)' }} /></a>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                    <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.target_keyword || '—'}</td>
                    <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{p.word_count?.toLocaleString() || '—'}</td>
                    <td className="text-right py-2.5 px-3"><ScoreMeter score={p.seo_score} /></td>
                    <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARTICLES — Full list */}
      {view === 'posts' && (
        <div className="glass-card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Title</th>
                <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Words</th>
                <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>SEO</th>
                <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No articles yet</td></tr>
              ) : posts.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <td className="py-2.5 px-3 max-w-[350px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
                      {p.published_url && <a href={p.published_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} style={{ color: 'var(--accent-blue)' }} /></a>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.target_keyword || '—'}</td>
                  <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{p.word_count?.toLocaleString() || '—'}</td>
                  <td className="text-right py-2.5 px-3"><ScoreMeter score={p.seo_score} /></td>
                  <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{(p.published_at || p.created_at) ? new Date(p.published_at || p.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KEYWORDS */}
      {view === 'keywords' && (
        <div className="glass-card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Search Volume</th>
                <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Difficulty</th>
                <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Current Rank</th>
                <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Target Rank</th>
              </tr>
            </thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No keywords tracked</td></tr>
              ) : keywords.map(kw => (
                <tr key={kw.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{kw.keyword}</td>
                  <td className="text-right py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>{kw.search_volume?.toLocaleString() || '—'}</td>
                  <td className="text-right py-2.5 px-3"><DifficultyBadge value={kw.difficulty} /></td>
                  <td className="text-right py-2.5 px-3 font-mono" style={{ color: kw.current_rank && kw.current_rank <= 10 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>{kw.current_rank ?? '—'}</td>
                  <td className="text-right py-2.5 px-3" style={{ color: 'var(--text-muted)' }}>{kw.target_rank ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PIPELINE — Kanban by status */}
      {view === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[
            { id: 'idea', label: 'Ideas', icon: Zap, color: 'var(--accent-purple)' },
            { id: 'draft', label: 'Drafts', icon: PenTool, color: 'var(--accent-amber)' },
            { id: 'outline', label: 'Outlines', icon: FileText, color: 'var(--accent-blue)' },
            { id: 'review', label: 'In Review', icon: Search, color: 'var(--accent-cyan)' },
            { id: 'published', label: 'Published', icon: Globe, color: 'var(--accent-emerald)' },
          ].map(col => {
            const colPosts = posts.filter(p => p.status === col.id)
            return (
              <div key={col.id} className="min-w-[220px] max-w-[260px] flex-1 shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <col.icon size={12} style={{ color: col.color }} />
                    <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: col.color }}>{col.label}</h3>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>{colPosts.length}</span>
                </div>
                <div className="p-2 rounded-xl min-h-[250px] space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {colPosts.length === 0 ? (
                    <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Empty</p>
                  ) : colPosts.slice(0, 15).map(p => (
                    <div key={p.id} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        {p.word_count ? <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{p.word_count.toLocaleString()} words</span> : <span />}
                        {p.published_url && <a href={p.published_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={10} style={{ color: 'var(--accent-blue)' }} /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
