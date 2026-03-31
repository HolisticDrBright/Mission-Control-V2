'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Template {
  id: string
  name: string
  type: string
  subject: string
  body: string
  notes: string
  usage_count: number
  created_at: string
}

const TYPE_OPTIONS = [
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'breakup', label: 'Breakup' },
  { value: 'referral', label: 'Referral' },
  { value: 'meeting_request', label: 'Meeting Request' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'other', label: 'Other' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutreachTemplatesPage() {
  const supabase = createClient()

  const [templates, setTemplates] = useState<Template[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pageSize = 25

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const { data, count, error } = await supabase
      .from('mc_outreach_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (!error && data) {
      setTemplates(data as Template[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreate = async (formData: Record<string, unknown>) => {
    const { error } = await supabase.from('mc_outreach_templates').insert({
      name: formData.name,
      type: formData.type || 'cold_outreach',
      subject: formData.subject || null,
      body: formData.body || null,
      notes: formData.notes || null,
    })
    if (error) throw new Error(error.message)
    await fetchTemplates()
  }

  type Row = Record<string, unknown>

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Row) => {
        const r = row as unknown as Template
        return (
          <button
            type="button"
            className="hover:underline font-medium text-left"
            style={{ color: 'var(--accent-blue)' }}
            onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id) }}
          >
            {r.name}
          </button>
        )
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (row: Row) => <StatusBadge status={(row.type as string) || 'other'} />,
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (row: Row) => (
        <span className="truncate block max-w-[250px]">{(row.subject as string) || '—'}</span>
      ),
    },
    {
      key: 'usage_count',
      label: 'Uses',
      render: (row: Row) => String(row.usage_count ?? 0),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Row) =>
        row.created_at ? new Date(row.created_at as string).toLocaleDateString() : '—',
    },
  ]

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Outreach', href: '/outreach' },
          { label: 'Templates' },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Email Templates
        </h1>
        <button
          type="button"
          className="glass-button glass-button-primary text-sm px-5 py-2"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create Template'}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            New Template
          </h2>
          <GlassForm onSubmit={handleCreate} submitLabel="Create Template">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Template Name" name="name" required placeholder="Cold Intro v2" />
              <Select label="Type" name="type" options={TYPE_OPTIONS} />
            </div>
            <Field label="Subject Line" name="subject" placeholder="Quick question about {{company}}" description="Use {{variable}} syntax for merge fields" />
            <TextArea
              label="Body"
              name="body"
              placeholder="Hi {{first_name}},&#10;&#10;I noticed {{company}} is..."
              rows={8}
              description="Available variables: {{first_name}}, {{last_name}}, {{company}}, {{title}}, {{custom_1}}"
            />
            <TextArea label="Notes" name="notes" placeholder="Internal notes about when to use this template..." rows={3} />
          </GlassForm>
        </GlassCard>
      )}

      {/* Data table */}
      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading templates...</p>
        ) : (
          <>
            <DataTable
              columns={columns as unknown as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
              rows={templates as unknown as Record<string, unknown>[]}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              emptyMessage="No templates found. Create your first template above."
            />

            {/* Expanded detail */}
            {expandedId && (() => {
              const t = templates.find((tpl) => tpl.id === expandedId)
              if (!t) return null
              return (
                <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {t.name} - Full Preview
                  </h3>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <strong>Subject:</strong> {t.subject || '—'}
                  </p>
                  <pre className="text-xs whitespace-pre-wrap mt-2 p-3 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)' }}>
                    {t.body || 'No body content.'}
                  </pre>
                  {t.notes && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      <strong>Notes:</strong> {t.notes}
                    </p>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </GlassCard>
    </main>
  )
}
