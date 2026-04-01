'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  FileText,
  TrendingUp,
  BarChart3,
  Globe,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
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
  meta_description: string | null
  word_count: number | null
  seo_score: number | null
  published_url: string | null
  published_at: string | null
  estimated_traffic: number | null
  actual_traffic: number | null
  created_at: string
}

interface Keyword {
  id: string
  keyword: string
  search_volume: number | null
  difficulty: number | null
  current_rank: number | null
  target_rank: number | null
  last_checked_at: string | null
}

const POST_STATUSES = [
  { id: 'idea', label: 'Idea' },
  { id: 'draft', label: 'Draft' },
  { id: 'outline', label: 'Outline' },
  { id: 'review', label: 'Review' },
  { id: 'published', label: 'Published' },
]

export default function SEODashboard({ siteName, domain, accentColor }: SEODashboardProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'calendar' | 'keywords' | 'list'>('list')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch blog posts - filter by published_url containing the domain
      const postsRes = await fetch(`/api/seo?domain=${encodeURIComponent(domain)}`)
      if (postsRes.ok) {
        const json = await postsRes.json()
        const blogPosts = json.data?.blog_posts || json.data || []
        setPosts(Array.isArray(blogPosts) ? blogPosts : [])
        const kw = json.data?.keywords || []
        setKeywords(Array.isArray(kw) ? kw : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [domain])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Also try fetching directly from WordPress sync
  useEffect(() => {
    if (posts.length === 0 && !loading) {
      fetch(`/api/seo/sync-wordpress?wp_url=https://${domain}&per_page=100`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.data && json.data.length > 0) {
            setPosts(json.data.map((p: Record<string, unknown>) => ({
              id: p.wp_id || String(Math.random()),
              title: p.title || '',
              slug: p.slug || null,
              status: 'published',
              target_keyword: null,
              meta_description: (p.excerpt as string)?.substring(0, 160) || null,
              word_count: p.word_count || null,
              seo_score: null,
              published_url: p.published_url || null,
              published_at: p.published_at || null,
              estimated_traffic: null,
              actual_traffic: null,
              created_at: p.published_at as string || new Date().toISOString(),
            })))
          }
        })
        .catch(() => {})
    }
  }, [posts.length, loading, domain])

  // Computed stats
  const stats = useMemo(() => {
    const published = posts.filter(p => p.status === 'published')
    const drafts = posts.filter(p => p.status !== 'published')
    const scores = published.map(p => p.seo_score).filter((s): s is number => s !== null && s > 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const totalTraffic = published.reduce((sum, p) => sum + (p.estimated_traffic || p.actual_traffic || 0), 0)

    return {
      total: posts.length,
      published: published.length,
      drafts: drafts.length,
      avgScore,
      totalTraffic,
    }
  }, [posts])

  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{siteName} SEO</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <GlassCard key={i} className="p-4 animate-pulse">
              <div className="h-3 w-16 rounded bg-white/5 mb-2" />
              <div className="h-6 w-10 rounded bg-white/5" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {siteName} SEO
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {domain} · {stats.total} posts
          </p>
        </div>
        <div className="flex gap-2">
          <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="glass-button text-sm flex items-center gap-2">
            <Sparkles size={14} />
            Sync WordPress
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Posts', value: String(stats.total), icon: FileText },
          { label: 'Published', value: String(stats.published), icon: Globe },
          { label: 'In Draft', value: String(stats.drafts), icon: FileText },
          { label: 'Avg SEO Score', value: stats.avgScore ? String(stats.avgScore) : '—', icon: BarChart3 },
          { label: 'Est. Traffic', value: stats.totalTraffic > 0 ? stats.totalTraffic.toLocaleString() : '—', icon: TrendingUp },
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
        {(['list', 'calendar', 'keywords'] as const).map(v => (
          <button
            key={v}
            className="px-4 py-1.5 rounded-lg text-sm capitalize transition-all"
            style={{
              background: activeView === v ? 'var(--glass-bg-hover)' : 'transparent',
              color: activeView === v ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            onClick={() => setActiveView(v)}
          >
            {v === 'list' ? 'All Posts' : v === 'calendar' ? 'Content Calendar' : 'Keyword Tracker'}
          </button>
        ))}
      </div>

      {/* All Posts List */}
      {activeView === 'list' && (
        <GlassCard className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Title</th>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                  <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Words</th>
                  <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SEO</th>
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Published</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No posts found. Click &quot;Sync WordPress&quot; to pull posts from {domain}.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <td className="py-2.5 px-3 max-w-[300px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                            {post.title}
                          </span>
                          {post.published_url && (
                            <a href={post.published_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <ExternalLink size={12} style={{ color: 'var(--accent-blue)' }} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>
                        {post.target_keyword || '—'}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {post.word_count?.toLocaleString() || '—'}
                      </td>
                      <td className="text-right py-2.5 px-3">
                        {post.seo_score ? (
                          <span style={{
                            color: post.seo_score >= 80 ? 'var(--accent-emerald)' : post.seo_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                          }}>
                            {post.seo_score}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Content Calendar */}
      {activeView === 'calendar' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {POST_STATUSES.map((status) => {
            const statusPosts = posts.filter(p => p.status === status.id)
            return (
              <div key={status.id} className="min-w-[220px] max-w-[260px] flex-1">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    {status.label}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                    {statusPosts.length}
                  </span>
                </div>
                <div className="p-2 rounded-xl min-h-[200px] space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  {statusPosts.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No posts</p>
                  ) : (
                    statusPosts.slice(0, 10).map((post) => (
                      <div key={post.id} className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{post.title}</p>
                        {post.word_count && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{post.word_count.toLocaleString()} words</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Keyword Tracker */}
      {activeView === 'keywords' && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tracked Keywords</h3>
            <button className="glass-button text-xs flex items-center gap-1">
              <Plus size={12} /> Add Keyword
            </button>
          </div>
          {keywords.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Search size={32} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                No keywords tracked yet.
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
                    <th className="text-right text-xs py-2 px-3">Rank</th>
                    <th className="text-right text-xs py-2 px-3">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{kw.keyword}</td>
                      <td className="text-right py-2 px-3" style={{ color: 'var(--text-secondary)' }}>{kw.search_volume?.toLocaleString() || '—'}</td>
                      <td className="text-right py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{
                          background: (kw.difficulty || 0) > 70 ? 'rgba(244,63,94,0.15)' : (kw.difficulty || 0) > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                          color: (kw.difficulty || 0) > 70 ? 'var(--accent-rose)' : (kw.difficulty || 0) > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                        }}>
                          {kw.difficulty ?? '—'}
                        </span>
                      </td>
                      <td className="text-right py-2 px-3" style={{ color: 'var(--text-primary)' }}>{kw.current_rank ?? '—'}</td>
                      <td className="text-right py-2 px-3" style={{ color: 'var(--text-muted)' }}>{kw.target_rank ?? '—'}</td>
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
