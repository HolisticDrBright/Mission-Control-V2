'use client'

import { useState, useEffect } from 'react'

export default function SEOAutomationPage() {
  const [posts, setPosts] = useState<Array<Record<string, unknown>>>([])
  const [keywords, setKeywords] = useState<Array<Record<string, unknown>>>([])
  const [googleData, setGoogleData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'posts' | 'keywords' | 'google'>('google')

  useEffect(() => {
    Promise.all([
      fetch('/api/seo').then(r => r.json()),
      fetch('/api/seo/google-console').then(r => r.json())
    ])
    .then(([seoData, googleConsoleData]) => {
      setPosts(Array.isArray(seoData?.data?.blog_posts) ? seoData.data.blog_posts : [])
      setKeywords(Array.isArray(seoData?.data?.keywords) ? seoData.data.keywords : [])
      setGoogleData(googleConsoleData)
    })
    .catch(err => setError(String(err)))
    .finally(() => setLoading(false))
  }, [])

  const getUrl = (p: Record<string, unknown>) => (p.url as string) || (p.published_url as string) || null
  const getStatus = (p: Record<string, unknown>) => (p.status as string) || (p.url ? 'published' : 'draft')
  const getDomain = (p: Record<string, unknown>) => {
    const url = getUrl(p)
    if (!url) return '—'
    try { return new URL(url).hostname.replace('www.', '') } catch { return '—' }
  }

  if (loading) return (
    <div style={{ padding: 24, color: '#eee', background: 'transparent' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16, fontWeight: 600 }}>SEO Automation</h1>
      <p style={{ color: '#888' }}>Loading SEO data...</p>
    </div>
  )

  const published = posts.filter(p => getStatus(p) === 'published')

  return (
    <div style={{ padding: 24, color: '#eee', background: 'transparent', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>SEO Automation</h1>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{posts.length} articles · {keywords.length} keywords</p>
        </div>
        <button className="glass-button" style={{ fontSize: 13, padding: '6px 16px' }} onClick={() => window.location.reload()}>Refresh</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#f43f5e' }}>
          Error: {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Articles', value: posts.length, color: '#3b82f6' },
          { label: 'Published', value: published.length, color: '#10b981' },
          { label: 'Keywords', value: keywords.length, color: '#f59e0b' },
          { label: 'Total Words', value: posts.reduce((s, p) => s + ((p.word_count as number) || 0), 0).toLocaleString(), color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', margin: '0 0 4px' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#eee' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)', width: 'fit-content', marginBottom: 20 }}>
        <button style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', background: view === 'posts' ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === 'posts' ? '#eee' : '#888' }} onClick={() => setView('posts')}>Articles ({posts.length})</button>
        <button style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', background: view === 'keywords' ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === 'keywords' ? '#eee' : '#888' }} onClick={() => setView('keywords')}>Keywords ({keywords.length})</button>
      </div>

      {/* Articles table */}
      {view === 'posts' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Title</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Site</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Words</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Published</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#666' }}>No articles found</td></tr>
              ) : posts.map((p, i) => {
                const url = getUrl(p)
                const domain = getDomain(p)
                const status = getStatus(p)
                return (
                  <tr key={(p.id as string) || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', maxWidth: 350 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.title as string}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: domain.includes('holistic') ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)', color: domain.includes('holistic') ? '#10b981' : '#06b6d4' }}>{domain.split('.')[0]}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: status === 'published' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: status === 'published' ? '#10b981' : '#f59e0b' }}>{status}</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: '#aaa' }}>{(p.word_count as number)?.toLocaleString() || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>{p.published_at ? new Date(p.published_at as string).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 12 }}>View ↗</a> : <span style={{ color: '#555' }}>—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Keywords table */}
      {view === 'keywords' && (
        <div className="glass-card" style={{ padding: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Keyword</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Volume</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Difficulty</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Rank</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Target</th>
              </tr>
            </thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#666' }}>No keywords tracked</td></tr>
              ) : keywords.map((kw, i) => (
                <tr key={(kw.id as string) || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{kw.keyword as string}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', color: '#aaa' }}>{(kw.search_volume as number)?.toLocaleString() || '—'}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {kw.difficulty != null ? (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: (kw.difficulty as number) > 70 ? 'rgba(244,63,94,0.12)' : (kw.difficulty as number) > 40 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', color: (kw.difficulty as number) > 70 ? '#f43f5e' : (kw.difficulty as number) > 40 ? '#f59e0b' : '#10b981' }}>
                        {kw.difficulty as number}
                      </span>
                    ) : <span style={{ color: '#555' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'monospace', color: (kw.current_rank as number) && (kw.current_rank as number) <= 10 ? '#10b981' : '#eee' }}>{(kw.current_rank as number) ?? '—'}</td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', color: '#888' }}>{(kw.target_rank as number) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
