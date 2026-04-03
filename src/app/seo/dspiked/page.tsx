'use client'

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'

interface Post {
  id: string
  title: string
  status?: string | null
  word_count?: number | null
  published_url?: string | null
  url?: string | null
  published_at: string | null
}

function getUrl(p: Post): string | null { return p.url || p.published_url || null }
function getStatus(p: Post): string { return p.status || (p.published_at || p.url ? 'published' : 'draft') }

interface KW {
  id: string
  keyword: string
  search_volume: number | null
  difficulty: number | null
  current_rank: number | null
}

export default function DSpikedSEOPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [keywords, setKeywords] = useState<KW[]>([])
  const [googleData, setGoogleData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'posts' | 'keywords' | 'google'>('google')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [seoRes, googleRes] = await Promise.all([
        fetch('/api/seo?domain=dspiked.com'),
        fetch('/api/seo/google-console?site=dspiked.com')
      ])
      if (seoRes.ok) {
        const json = await seoRes.json()
        setPosts(Array.isArray(json.data?.blog_posts) ? json.data.blog_posts : [])
        setKeywords(Array.isArray(json.data?.keywords) ? json.data.keywords : [])
      }
      if (googleRes.ok) {
        const googleJson = await googleRes.json()
        setGoogleData(googleJson)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="p-6"><p style={{ color: 'var(--text-muted)' }}>Loading SEO data...</p></div>

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>DSpiked SEO</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>dspiked.com &middot; {posts.length} posts</p>
        </div>
        <button className="glass-button text-sm flex items-center gap-2" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4"><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total Posts</p><p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{posts.length}</p></div>
        <div className="glass-card p-4"><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Published</p><p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{posts.filter(p => getStatus(p) === 'published').length}</p></div>
        <div className="glass-card p-4"><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Keywords</p><p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{keywords.length}</p></div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'google' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'google' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('google')}>📊 Google Data</button>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'posts' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'posts' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('posts')}>Posts ({posts.length})</button>
        <button className="px-4 py-1.5 rounded-lg text-sm" style={{ background: view === 'keywords' ? 'var(--glass-bg-hover)' : 'transparent', color: view === 'keywords' ? 'var(--text-primary)' : 'var(--text-muted)' }} onClick={() => setView('keywords')}>Keywords ({keywords.length})</button>
      </div>

      {view === 'google' && googleData && (
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📈 D-Spiked.com Rankings</h3>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: 'SEO Grade', value: googleData.grade, sub: googleData.gradeLabel, color: '#10b981', big: true },
              { label: 'Clicks', value: googleData.summary?.totalClicks?.toLocaleString(), color: '#3b82f6' },
              { label: 'Impressions', value: googleData.summary?.totalImpressions?.toLocaleString(), color: '#f59e0b' },
              { label: 'CTR', value: `${googleData.summary?.avgCTR?.toFixed(2)}%`, color: '#8b5cf6' },
              { label: 'Avg Pos', value: googleData.summary?.avgPosition?.toFixed(1), color: '#06b6d4' },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4" style={{ borderLeft: `3px solid ${s.color}` }}>
                <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                <p className="text-2xl font-semibold mt-1" style={{ color: s.color }}>{s.value}</p>
                {s.sub && <p className="text-xs mt-1" style={{ color: '#aaa' }}>{s.sub}</p>}
              </div>
            ))}
          </div>
          <div className="mb-6">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Top Keywords</p>
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-2" style={{ color: 'var(--text-muted)' }}>Keyword</th>
                <th className="text-right py-2 px-2" style={{ color: 'var(--text-muted)' }}>Clicks</th>
                <th className="text-right py-2 px-2" style={{ color: 'var(--text-muted)' }}>Imp.</th>
                <th className="text-right py-2 px-2" style={{ color: 'var(--text-muted)' }}>CTR</th>
                <th className="text-right py-2 px-2" style={{ color: 'var(--text-muted)' }}>Pos</th>
              </tr></thead>
              <tbody>
                {(googleData.topQueries || []).slice(0, 15).map((q: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>{q.keyword}</td>
                    <td className="text-right py-2 px-2" style={{ color: '#10b981' }}>{q.clicks}</td>
                    <td className="text-right py-2 px-2" style={{ color: '#3b82f6' }}>{q.impressions}</td>
                    <td className="text-right py-2 px-2" style={{ color: '#f59e0b' }}>{(q.ctr * 100).toFixed(1)}%</td>
                    <td className="text-right py-2 px-2" style={{ color: '#8b5cf6' }}>#{Math.round(q.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'posts' && googleData && (
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
                  <td className="py-2.5 px-3 max-w-[350px]"><div className="flex items-center gap-2"><span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{p.title}</span>{getUrl(p) && <a href={getUrl(p)!} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} style={{ color: 'var(--accent-blue)' }} /></a>}</div></td>
                  <td className="py-2.5 px-3"><span className="text-xs px-2 py-0.5 rounded" style={{ background: getStatus(p) === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: getStatus(p) === 'published' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{getStatus(p)}</span></td>
                  <td className="text-right py-2.5 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{p.word_count?.toLocaleString() || '—'}</td>
                  <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--text-muted)' }}>{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  <td className="text-right py-2.5 px-3" style={{ color: kw.difficulty && kw.difficulty > 70 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{kw.difficulty ?? '—'}</td>
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
