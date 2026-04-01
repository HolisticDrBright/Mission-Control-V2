'use client'

import { useState, useEffect } from 'react'

export default function SEOTestPage() {
  const [raw, setRaw] = useState<string>('Loading...')
  const [posts, setPosts] = useState<Array<{ id: string; title: string; status: string; word_count: number | null; published_url: string | null }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/seo')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => {
        setRaw(JSON.stringify(json, null, 2).substring(0, 500))
        const blogPosts = json?.data?.blog_posts
        if (Array.isArray(blogPosts)) {
          setPosts(blogPosts)
        } else {
          setError('json.data.blog_posts is not an array. Got: ' + typeof blogPosts)
        }
      })
      .catch(err => {
        setError(String(err))
        setRaw('Fetch failed: ' + String(err))
      })
  }, [])

  return (
    <div style={{ padding: 24, color: '#eee', fontFamily: 'monospace', background: '#0a0a1a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>SEO Debug Test Page</h1>

      {error && (
        <div style={{ background: '#3a0a0a', border: '1px solid #f44', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>ERROR:</strong> {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <strong>Posts found: {posts.length}</strong>
      </div>

      {posts.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Words</th>
              <th style={{ textAlign: 'left', padding: 8 }}>URL</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => (
              <tr key={p.id || i} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: 8 }}>{p.title}</td>
                <td style={{ padding: 8 }}>{p.status}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{p.word_count ?? '—'}</td>
                <td style={{ padding: 8 }}>{p.published_url ? <a href={p.published_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6af' }}>link</a> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <details style={{ marginTop: 24 }}>
        <summary style={{ cursor: 'pointer', color: '#888' }}>Raw API response (first 500 chars)</summary>
        <pre style={{ background: '#111', padding: 12, borderRadius: 8, marginTop: 8, fontSize: 11, overflow: 'auto', maxHeight: 300 }}>{raw}</pre>
      </details>
    </div>
  )
}
