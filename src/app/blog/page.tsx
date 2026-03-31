'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, ChevronUp } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { GlassForm, Field, TextArea, Select, DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import { createClient } from '@/lib/supabase/client'

interface BlogPost {
  id: string
  title: string
  status: string
  target_keyword: string | null
  word_count: number | null
  seo_score: number | null
  published_at: string | null
  created_at: string
  [key: string]: unknown
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
      setPosts((data as BlogPost[]) ?? [])
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from('blog_posts').insert({
        site_id: formData.site_id || null,
        title: formData.title,
        target_keyword: formData.target_keyword || null,
        status: formData.status || 'idea',
        meta_description: formData.meta_description || null,
      })
      if (error) throw new Error(error.message)
      await fetchPosts()
      setShowForm(false)
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to create blog post')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status', render: (row: BlogPost) => <StatusBadge status={row.status} /> },
    { key: 'target_keyword', label: 'Target Keyword' },
    {
      key: 'word_count',
      label: 'Words',
      render: (row: BlogPost) => (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {row.word_count != null ? row.word_count.toLocaleString() : '\u2014'}
        </span>
      ),
    },
    {
      key: 'seo_score',
      label: 'SEO Score',
      render: (row: BlogPost) => {
        if (row.seo_score == null) return <span style={{ color: 'var(--text-muted)' }}>{'\u2014'}</span>
        const color = row.seo_score >= 80 ? 'var(--accent-emerald)' : row.seo_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-rose)'
        return <span className="text-xs font-medium" style={{ color }}>{row.seo_score}%</span>
      },
    },
    {
      key: 'published_at',
      label: 'Published',
      render: (row: BlogPost) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {row.published_at ? new Date(row.published_at).toLocaleDateString() : '\u2014'}
        </span>
      ),
    },
  ]

  return (
    <section className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[{ label: 'Mission Control', href: '/dashboard' }, { label: 'Blog Posts' }]} />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={20} style={{ color: 'var(--accent-purple, var(--accent-blue))' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Blog Posts</h1>
        </div>
        <button className="glass-button glass-button-primary text-sm flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showForm ? 'Hide Form' : 'Create Post'}
        </button>
      </header>

      {showForm && (
        <GlassCard>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>New Blog Post</h2>
          <GlassForm onSubmit={handleCreate} submitLabel="Create Post">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title" name="title" required placeholder="Post title" />
              <Field label="Site ID" name="site_id" placeholder="e.g. holistic-dr-bright" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Target Keyword" name="target_keyword" placeholder="Primary SEO keyword" />
              <Select
                label="Status"
                name="status"
                options={[
                  { value: 'idea', label: 'Idea' },
                  { value: 'keyword_research', label: 'Keyword Research' },
                  { value: 'outline', label: 'Outline' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'review', label: 'Review' },
                  { value: 'published', label: 'Published' },
                ]}
              />
            </div>
            <TextArea label="Meta Description" name="meta_description" placeholder="SEO meta description (150-160 chars ideal)" rows={2} />
          </GlassForm>
        </GlassCard>
      )}

      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading blog posts...</p>
        ) : (
          <DataTable columns={columns} rows={posts} emptyMessage="No blog posts found." />
        )}
      </GlassCard>
    </section>
  )
}
