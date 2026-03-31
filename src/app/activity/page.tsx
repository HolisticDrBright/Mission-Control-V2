'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity as ActivityIcon, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { GlassForm, Field, TextArea, DataTable, Breadcrumbs } from '@/components/ui/FormComponents'
import { createClient } from '@/lib/supabase/client'

interface ActivityEntry {
  id: string
  event_type: string
  entity_type: string | null
  entity_id: string | null
  description: string
  created_at: string
  [key: string]: unknown
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)

  const supabase = createClient()

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter.trim()) {
      query = query.ilike('event_type', `%${filter.trim()}%`)
    }

    const { data } = await query
    setEntries((data as ActivityEntry[]) ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleCreate = async (formData: Record<string, unknown>) => {
    const { error } = await supabase.from('activity_log').insert({
      event_type: formData.event_type,
      description: formData.description,
      entity_type: formData.entity_type || null,
      entity_id: formData.entity_id || null,
    })
    if (error) throw new Error(error.message)
    await fetchEntries()
    setShowForm(false)
  }

  const columns = [
    { key: 'event_type', label: 'Event Type' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'description', label: 'Description' },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (row: ActivityEntry) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <section className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[{ label: 'Mission Control', href: '/dashboard' }, { label: 'Activity Log' }]} />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <ActivityIcon size={20} style={{ color: 'var(--accent-blue)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Log</h1>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter by event type..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="glass-input text-sm w-48"
          />
          <button className="glass-button glass-button-primary text-sm flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
            {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
            {showForm ? 'Hide' : 'Log Activity'}
          </button>
        </div>
      </header>

      {showForm && (
        <GlassCard>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Log New Activity</h2>
          <GlassForm onSubmit={handleCreate} submitLabel="Log Activity">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Event Type" name="event_type" required placeholder="e.g. task_created, deploy, sync" />
              <Field label="Entity Type" name="entity_type" placeholder="e.g. task, project, agent" />
            </div>
            <Field label="Entity ID" name="entity_id" placeholder="Optional entity identifier" />
            <TextArea label="Description" name="description" required placeholder="What happened?" rows={3} />
          </GlassForm>
        </GlassCard>
      )}

      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading activity log...</p>
        ) : (
          <DataTable columns={columns} rows={entries} emptyMessage="No activity logged yet." />
        )}
      </GlassCard>
    </section>
  )
}
