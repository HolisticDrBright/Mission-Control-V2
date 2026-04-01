'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  TrendingUp, FileText, Search, Globe, BarChart3, RefreshCw, ExternalLink,
  Zap, PenTool, CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types — matches ACTUAL blog_posts table on the droplet
// ---------------------------------------------------------------------------

interface BlogPost {
  id: string
  title: string
  url: string | null           // NOT published_url
  published_at: string | null
  created_at: string
  site_id: string | null
  article_id: string | null
  wordpress_post_id: string | null
  // These may or may not exist depending on the table version
  slug?: string | null
  status?: string | null
  word_count?: number | null
  seo_score?: number | null
  target_keyword?: string | null
  meta_description?: string | null
  published_url?: string | null  // fallback
}

interface Keyword {
  id: string
  keyword: string
  search_volume: number | null
  difficulty: number | null
  current_rank: number | null
  target_rank: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPostUrl(p: BlogPost): string | null {
  return p.url || p.published_url || null
}

function getPostStatus(p: BlogPost): string {
  if (p.status) return p.status
  if (p.published_at || p.url) return 'published'
  return 'draft'
}

function getPostDomain(p: BlogPost): string {
  const url = p.url || p.published_url || ''
  try { return new URL(url).hostname } catch { return '—' }
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function DifficultyBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const color = value > 70 ? 'var(--accent-rose)' : value > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
  const label = value > 70 ? 'Hard' : value > 40 ? 'Medium' : 'Easy'
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      {value} · {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SEOAutomationPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'overview' | 'posts' | 'keywords'>('overview')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/seo')
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()
      const blogPosts = json.data?.blog_posts
      const kw = json.data?.keywords
      setPosts(Array.isArray(blogPosts) ? blogPosts : [])
      setKeywords(Array.isArray(kw) ? kw : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const stats = useMemo(() => {
    const published = posts.filter(p => getPostStatus(p) === 'published')
    const withUrl = posts.filter(p => getPostUrl(p))
    const latest = [...published].sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())[0]
    const totalWords = posts.reduce((s, p) => s + (p.word_count || 0), 0)

    return { total: posts.length, published: published.length, withUrl: withUrl.length, latest, totalWords }
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading SEO data...</p>
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.total} articles · {keywords.length} keywords tracked</p>
          </div>
        </div>
        <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Total Articles</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Published</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.published}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>With Live URL</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stats.withUrl}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search size={14} style={{ color: 'var(--accent-amber)' }} />
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Keywords Tracked</span>
          </div>
          <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{keywords.length}</p>
        </div>
      </div>

      {/* Latest published */}
      {stats.latest && (
        <div className="glass-card p-4 flex items-center gap-3" style={{ borderLeft: '3px solid var(--accent-emerald)' }}>
          <CheckCircle2 size={14} style={{ color: 'var(--accent-emerald)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest published</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{stats.latest.title}</p>
          </div>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(stats.latest.published_at)}</span>
          {getPostUrl(stats.latest) && (
            <a href={getPostUrl(stats.latest)!} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <ExternalLink size={14} style={{ color: 'var(--accent-blue)' }} />
            </a>
          )}
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {(['overview', 'posts', 'keywords'] as const).map(v => (
          <button key={v} className="px-4 py-1.5 rounded-lg text-sm capitalize" style={{ background: view === v ? 'var(--glass-bg-hover)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView(v)}>
            {v === 'overview' ? `Articles (${posts.length})` : v === 'posts' ? 'All Articles' : `Keywords (${keywords.length})`}
          </button>
        ))}
      </div>

      {/* Articles Table */}
      {(view === 'overview' || view === 'posts') && (
        <div className="glass-card p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Title</th>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Site</th>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Status</th>
                  {posts.some(p => p.word_count) && <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Words</th>}
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Published</th>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Link</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No articles found. Sync from WordPress to populate.</td></tr>
                ) : (view === 'overview' ? posts.slice(0, 20) : posts).map(p => {
                  const postUrl = getPostUrl(p)
                  const status = getPostStatus(p)
                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <td className="py-2.5 px-3 max-w-[400px]">
                        <span className="truncate block font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{
                          background: getPostDomain(p).includes('holistic') ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)',
                          color: getPostDomain(p).includes('holistic') ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                        }}>{getPostDomain(p).replace('www.','').split('.')[0]}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs px-2 py-0.5 rounded" style={{
                          background: status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: status === 'published' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        }}>{status}</span>
                      </td>
                      {posts.some(pp => pp.word_count) && (
                        <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.word_count?.toLocaleString() || '—'}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {postUrl ? (
                          <a href={postUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent-blue)' }}>
                            <ExternalLink size={11} /> View
                          </a>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keywords Table */}
      {view === 'keywords' && (
        <div className="glass-card p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                  <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Search Volume</th>
                  <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Difficulty</th>
                  <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Current Rank</th>
                  <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Target</th>
                </tr>
              </thead>
              <tbody>
                {keywords.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No keywords tracked yet.</td></tr>
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
        </div>
      )}
    </div>
  )
}
