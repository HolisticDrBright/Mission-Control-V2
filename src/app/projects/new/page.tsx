'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

const TYPE_OPTIONS = [
  { value: 'app_dev', label: 'App Dev' },
  { value: 'seo', label: 'SEO' },
  { value: 'ugc', label: 'UGC' },
  { value: 'general', label: 'General' },
  { value: 'va', label: 'VA' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
]

export default function ProjectCreatePage() {
  const router = useRouter()

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('projects').insert(data)
      if (error) throw new Error(error.message)
      router.push('/projects')
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to create project')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[800px] mx-auto">
      <Breadcrumbs items={[{ label: 'Projects', href: '/projects' }, { label: 'Create New Project' }]} />

      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Create New Project
      </h1>

      <GlassCard className="p-5">
        <GlassForm onSubmit={handleCreate} submitLabel="Create Project">
          <Field label="Name" name="name" required placeholder="Project name" />
          <Field label="Slug" name="slug" required placeholder="project-slug" description="URL-friendly identifier" />
          <TextArea label="Description" name="description" placeholder="What is this project about?" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Type" name="type" options={TYPE_OPTIONS} required />
            <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue="active" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Color" name="color" type="color" defaultValue="#3b82f6" description="Brand color for this project" />
            <Field label="Icon" name="icon" defaultValue="\uD83D\uDE80" placeholder="Emoji icon" />
          </div>
        </GlassForm>
      </GlassCard>
    </div>
  )
}
