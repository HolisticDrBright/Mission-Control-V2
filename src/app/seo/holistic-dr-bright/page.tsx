'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, RefreshCw, Globe } from 'lucide-react'

interface Post {
  id: string
  title: string
  slug: string | null
  status: string
  target_keyword: string | null
  word_count: number | null
  seo_score: number | null
  published_url: string | null
  published_at: string | null
}

interface KW {
  id: string
  keyword: string
  search_volume: number | null
  difficulty: number | null
  current_rank: number | null
  target_rank: number | null
}

export default function HolisticDrBrightSEOPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [keywords, setKeywords] = useState<KW[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'posts' | 'keywords'>('posts')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/seo')
      if (res.ok) {
        const json = await res.json()
        setPosts(Array.isArray(json.data?.blog_posts) ? json.data.blog_posts : [])
        setKeywords(Array.isArray(json.data?.keywords) ? json.data.keywords : [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const published = posts.filter(p => p.status === 'published')

  if (loading) return <div className="p-6"><p style={{ color: 'var(--text-muted)' }}>Loading SEO data...</p></div>

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>HolisticDrBright SEO</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>holisticdrbright.com &middot; {posts.length} posts</p>
        </div>
        <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4"><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total Posts</p><p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{posts.length}</p></div>
        <div className="glass-card p-4"><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Published</p><p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{published.length}</p></div>
        <div className="glass-card p-4"><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Keywords</p><p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{keywords.length}</p></div>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'posts' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('posts')}>Posts ({posts.length})</button>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'keywords' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'keywords' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('keywords')}>Keywords ({keywords.length})</button>
      </div>

      {/* Posts */}
      {view === 'posts' && (
        <div className="glass-card p-5">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Title</th>
              <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Status</th>
              <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Words</th>
              <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Published</th>
            </tr></thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No posts</td></tr>
              ) : posts.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <td className="py-2.5 px-3 max-w-[350px]"><div className="flex items-center gap-2"><span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>{p.published_url && <a href={p.published_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} style={{ color: 'var(--accent-blue)' }} /></a>}</div></td>
                  <td className="py-2.5 px-3"><span className="text-xs px-2 py-0.5 rounded" style={{ background: p.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: p.status === 'published' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{p.status}</span></td>
                  <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{p.word_count?.toLocaleString() || '—'}</td>
                  <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Keywords */}
      {view === 'keywords' && (
        <div className="glass-card p-5">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Keyword</th>
              <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Volume</th>
              <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Difficulty</th>
              <th className="text-right py-2 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>Rank</th>
            </tr></thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No keywords</td></tr>
              ) : keywords.map(kw => (
                <tr key={kw.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{kw.keyword}</td>
                  <td className="text-right py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>{kw.search_volume?.toLocaleString() || '—'}</td>
                  <td className="text-right py-2.5 px-3" style={{ color: kw.difficulty && kw.difficulty > 70 ? 'var(--accent-rose)' : kw.difficulty && kw.difficulty > 40 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>{kw.difficulty ?? '—'}</td>
                  <td className="text-right py-2.5 px-3 font-mono" style={{ color: 'var(--text-primary)' }}>{kw.current_rank ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
