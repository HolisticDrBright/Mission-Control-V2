'use client'

import { useState, useEffect } from 'react'

interface BlogPost {
  id: string
  title: string
  url: string | null
  published_at: string | null
  created_at: string
}

export default function BlogPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/seo')
      .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json() })
      .then(json => setPosts(Array.isArray(json?.data?.blog_posts) ? json.data.blog_posts : []))
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  const getDomain = (p: BlogPost) => {
    if (!p.url) return '—'
    try { return new URL(p.url).hostname.replace('www.', '') } catch { return '—' }
  }

  if (loading) return <div style={{ padding: 24, color: '#eee' }}><h1 style={{ fontSize: 20, fontWeight: 600 }}>Blog Posts</h1><p style={{ color: '#888', marginTop: 8 }}>Loading...</p></div>

  return (
    <div style={{ padding: 24, color: '#eee', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Blog Posts</h1>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{posts.length} posts</p>
        </div>
        <button className="glass-button" style={{ fontSize: 13, padding: '6px 16px' }} onClick={() => window.location.reload()}>Refresh</button>
      </div>

      {error && <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 13, color: '#f43f5e' }}>Error: {error}</div>}

      <div className="glass-card" style={{ padding: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Title</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Site</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Published</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500 }}>Link</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#666' }}>No blog posts found</td></tr>
            ) : posts.map((p, i) => (
              <tr key={p.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 12px', maxWidth: 400 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.title}</span></td>
                <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: getDomain(p).includes('holistic') ? 'rgba(16,185,129,0.12)' : 'rgba(6,182,212,0.12)', color: getDomain(p).includes('holistic') ? '#10b981' : '#06b6d4' }}>{getDomain(p).split('.')[0]}</span></td>
                <td style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>{p.published_at ? new Date(p.published_at).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '10px 12px' }}>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 12 }}>View ↗</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
