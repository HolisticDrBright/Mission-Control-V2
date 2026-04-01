'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { FileText, TrendingUp, BarChart3, Globe, Search, RefreshCw, ExternalLink, Plus } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/FormComponents'

interface SEODashboardProps {
  siteName: string
  domain: string
  accentColor: string
}

interface BlogPost {
  id: string
  title: string
  slug: string | null
  status: string
  target_keyword: string | null
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
}

export default function SEODashboard({ siteName, domain, accentColor }: SEODashboardProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'posts' | 'keywords'>('posts')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/seo')
      if (!res.ok) throw new Error(`API ${res.status}`)
      const json = await res.json()
      setPosts(Array.isArray(json.data?.blog_posts) ? json.data.blog_posts : [])
      setKeywords(Array.isArray(json.data?.keywords) ? json.data.keywords : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setPosts([])
      setKeywords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const published = useMemo(() => posts.filter(p => p.status === 'published'), [posts])
  const totalWords = useMemo(() => posts.reduce((s, p) => s + (p.word_count || 0), 0), [posts])

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{siteName} SEO</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading SEO data...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{siteName} SEO</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{domain} &middot; {posts.length} posts</p>
        </div>
        <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Posts', value: posts.length, icon: FileText, color: accentColor },
          { label: 'Published', value: published.length, icon: Globe, color: 'var(--accent-emerald)' },
          { label: 'Keywords', value: keywords.length, icon: Search, color: 'var(--accent-cyan)' },
          { label: 'Total Words', value: totalWords.toLocaleString(), icon: BarChart3, color: 'var(--accent-purple)' },
        ].map(s => (
          <GlassCard key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={13} style={{ color: s.color }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'posts' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('posts')}>
          Posts ({posts.length})
        </button>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'keywords' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'keywords' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('keywords')}>
          Keywords ({keywords.length})
        </button>
      </div>

      {/* Posts */}
      {view === 'posts' && (
        <GlassCard className="p-5">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Title</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Words</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Published</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No posts found</td></tr>
              ) : posts.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <td className="py-2.5 px-3 max-w-[350px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
                      {p.published_url && <a href={p.published_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} style={{ color: 'var(--accent-blue)' }} /></a>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                  <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{p.word_count?.toLocaleString() || '—'}</td>
                  <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Keywords */}
      {view === 'keywords' && (
        <GlassCard className="p-5">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Volume</th>
                <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Difficulty</th>
                <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Rank</th>
              </tr>
            </thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No keywords tracked</td></tr>
              ) : keywords.map(kw => (
                <tr key={kw.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{kw.keyword}</td>
                  <td className="text-right py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>{kw.search_volume?.toLocaleString() || '—'}</td>
                  <td className="text-right py-2.5 px-3">{kw.difficulty != null ? <span style={{ color: kw.difficulty > 70 ? 'var(--accent-rose)' : kw.difficulty > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>{kw.difficulty}</span> : '—'}</td>
                  <td className="text-right py-2.5 px-3 font-mono" style={{ color: 'var(--text-primary)' }}>{kw.current_rank ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
