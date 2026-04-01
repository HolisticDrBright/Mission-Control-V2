'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, FileText, Search, Globe, BarChart3, RefreshCw, ExternalLink, Plus,
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
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SEOAutomationPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'posts' | 'keywords'>('posts')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch from /api/seo (blog_posts + keywords)
      const res = await fetch('/api/seo')
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      const json = await res.json()

      const blogPosts = json.data?.blog_posts || []
      const kw = json.data?.keywords || []

      setPosts(Array.isArray(blogPosts) ? blogPosts : [])
      setKeywords(Array.isArray(kw) ? kw : [])

      // If no posts from DB, try WordPress sync
      if (blogPosts.length === 0) {
        const wpRes = await fetch('/api/seo/sync-wordpress?wp_url=https://holisticdrbright.com&per_page=100')
        if (wpRes.ok) {
          const wpJson = await wpRes.json()
          if (wpJson.data?.length > 0) {
            setPosts(wpJson.data.map((p: Record<string, unknown>) => ({
              id: String(p.wp_id || Math.random()),
              title: String(p.title || ''),
              slug: p.slug as string || null,
              status: 'published',
              target_keyword: null,
              meta_description: null,
              word_count: p.word_count as number || null,
              seo_score: null,
              published_url: p.published_url as string || null,
              published_at: p.published_at as string || null,
              created_at: p.published_at as string || new Date().toISOString(),
            })))
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEO data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Stats
  const published = posts.filter(p => p.status === 'published')
  const drafts = posts.filter(p => p.status !== 'published')
  const totalWords = published.reduce((sum, p) => sum + (p.word_count || 0), 0)
  const scores = published.map(p => p.seo_score).filter((s): s is number => s !== null && s > 0)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  // Loading state
  if (loading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>SEO Automation</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-3 w-16 rounded bg-white/5 mb-2" />
              <div className="h-6 w-12 rounded bg-white/5" />
            </div>
          ))}
        </div>
        <div className="glass-card p-8">
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>Loading SEO data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} style={{ color: 'var(--accent-emerald)' }} />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            SEO Automation
          </h1>
        </div>
        <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={13} style={{ color: 'var(--accent-blue)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Posts</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{posts.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={13} style={{ color: 'var(--accent-emerald)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Published</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{published.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={13} style={{ color: 'var(--accent-amber)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Drafts</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{drafts.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Search size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Keywords</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{keywords.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={13} style={{ color: 'var(--accent-purple)' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Words</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{totalWords.toLocaleString()}</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          className="px-4 py-1.5 rounded-lg text-sm"
          style={{ background: view === 'posts' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          onClick={() => setView('posts')}
        >
          Blog Posts ({posts.length})
        </button>
        <button
          className="px-4 py-1.5 rounded-lg text-sm"
          style={{ background: view === 'keywords' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'keywords' ? 'var(--text-primary)' : 'var(--text-muted)' }}
          onClick={() => setView('keywords')}
        >
          Keywords ({keywords.length})
        </button>
      </div>

      {/* Blog Posts Table */}
      {view === 'posts' && (
        <div className="glass-card p-5">
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
                      No blog posts found. Sync from WordPress or create posts manually.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <td className="py-2.5 px-3 max-w-[350px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{post.title}</span>
                          {post.published_url && (
                            <a href={post.published_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <ExternalLink size={12} style={{ color: 'var(--accent-blue)' }} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3"><span className="text-xs px-2 py-0.5 rounded" style={{ background: post.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: post.status === 'published' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{post.status}</span></td>
                      <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{post.target_keyword || '—'}</td>
                      <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{post.word_count?.toLocaleString() || '—'}</td>
                      <td className="text-right py-2.5 px-3">
                        {post.seo_score ? (
                          <span style={{ color: post.seo_score >= 80 ? 'var(--accent-emerald)' : post.seo_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{post.seo_score}</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
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
                  <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                  <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Volume</th>
                  <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Difficulty</th>
                  <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Rank</th>
                  <th className="text-right py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Target</th>
                </tr>
              </thead>
              <tbody>
                {keywords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No keywords tracked yet.
                    </td>
                  </tr>
                ) : (
                  keywords.map((kw) => (
                    <tr key={kw.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{kw.keyword}</td>
                      <td className="text-right py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>{kw.search_volume?.toLocaleString() || '—'}</td>
                      <td className="text-right py-2.5 px-3">
                        {kw.difficulty !== null ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{
                            background: kw.difficulty > 70 ? 'rgba(244,63,94,0.15)' : kw.difficulty > 40 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                            color: kw.difficulty > 70 ? 'var(--accent-rose)' : kw.difficulty > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                          }}>{kw.difficulty}</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="text-right py-2.5 px-3 font-mono" style={{ color: 'var(--text-primary)' }}>{kw.current_rank ?? '—'}</td>
                      <td className="text-right py-2.5 px-3" style={{ color: 'var(--text-muted)' }}>{kw.target_rank ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
