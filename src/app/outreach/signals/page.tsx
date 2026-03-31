'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Signal {
  id: string
  company_name: string
  website: string
  signal_type: string
  signal_strength: string
  urgency_score: number
  source: string
  status: string
  detected_at: string
  recommended_approach: string
}

const SOURCE_OPTIONS = [
  { value: 'apollo', label: 'Apollo' },
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'researching', label: 'Researching' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'converted', label: 'Converted' },
  { value: 'dead', label: 'Dead' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutreachSignalsPage() {
  const supabase = createClient()

  const [signals, setSignals] = useState<Signal[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [createFromSignal, setCreateFromSignal] = useState<Signal | null>(null)

  const pageSize = 25

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count, error } = await supabase
        .from('mc_outreach_signals')
        .select('*', { count: 'exact' })
        .order('detected_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (!error && data) {
        setSignals(data as Signal[])
        setTotal(count ?? 0)
      }
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  const handleCreateLead = async (formData: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from('mc_outreach_leads').insert({
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        title: formData.title || null,
        linkedin_url: formData.linkedin_url || null,
        source: formData.source || 'other',
        status: formData.status || 'new',
        tags: formData.tags || [],
        notes: formData.notes || null,
      })
      if (error) throw new Error(error.message)
      setCreateFromSignal(null)
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to create lead')
    }
  }

  type Row = Record<string, unknown>

  const columns = [
    { key: 'company_name', label: 'Company' },
    {
      key: 'signal_type',
      label: 'Signal Type',
      render: (row: Row) => <StatusBadge status={(row.signal_type as string) || 'unknown'} />,
    },
    {
      key: 'signal_strength',
      label: 'Strength',
      render: (row: Row) => <StatusBadge status={((row.signal_strength as string) || 'cold').toLowerCase()} />,
    },
    {
      key: 'urgency_score',
      label: 'Urgency',
      render: (row: Row) => String(row.urgency_score ?? '—'),
    },
    { key: 'source', label: 'Source' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Row) => <StatusBadge status={(row.status as string) || 'new'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Row) => (
        <button
          type="button"
          className="glass-button text-xs px-3 py-1"
          onClick={(e) => { e.stopPropagation(); setCreateFromSignal(row as unknown as Signal) }}
        >
          Create Lead
        </button>
      ),
    },
  ]

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Outreach', href: '/outreach' },
          { label: 'Signals' },
        ]}
      />

      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Outreach Signals
      </h1>

      {/* Create lead from signal form */}
      {createFromSignal && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Create Lead from Signal: {createFromSignal.company_name}
            </h2>
            <button
              type="button"
              className="glass-button text-xs px-3 py-1"
              onClick={() => setCreateFromSignal(null)}
            >
              Cancel
            </button>
          </div>
          <GlassForm onSubmit={handleCreateLead} submitLabel="Create Lead">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name" name="first_name" required placeholder="Contact first name" />
              <Field label="Last Name" name="last_name" placeholder="Contact last name" />
              <Field label="Email" name="email" type="email" required placeholder="email@example.com" />
              <Field label="Phone" name="phone" type="tel" placeholder="+1 555-0123" />
              <Field
                label="Company"
                name="company"
                defaultValue={createFromSignal.company_name || ''}
                description="Pre-filled from signal"
              />
              <Field label="Title" name="title" placeholder="VP of Engineering" />
              <Field
                label="LinkedIn URL"
                name="linkedin_url"
                type="url"
                defaultValue={createFromSignal.website || ''}
                description="Pre-filled with signal website"
              />
              <Select label="Source" name="source" options={SOURCE_OPTIONS} defaultValue="other" />
              <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue="new" />
              <Field
                label="Tags"
                name="tags"
                placeholder="signal, hot-lead"
                dataType="array"
                description="Comma-separated list of tags"
              />
            </div>
            <TextArea
              label="Notes"
              name="notes"
              defaultValue={`Created from signal: ${createFromSignal.signal_type} (${createFromSignal.signal_strength})\nRecommended approach: ${createFromSignal.recommended_approach || 'N/A'}`}
              rows={4}
            />
          </GlassForm>
        </GlassCard>
      )}

      {/* Data table */}
      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading signals...</p>
        ) : (
          <DataTable
            columns={columns as unknown as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
            rows={signals as unknown as Record<string, unknown>[]}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            emptyMessage="No signals detected yet."
          />
        )}
      </GlassCard>
    </main>
  )
}
