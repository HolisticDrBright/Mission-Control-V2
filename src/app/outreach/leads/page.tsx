'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string
  title: string
  linkedin_url: string
  source: string
  status: string
  tags: string[]
  notes: string
  lead_score: number
  last_action_date: string
  created_at: string
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'researching', label: 'Researching' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'converted', label: 'Converted' },
  { value: 'dead', label: 'Dead' },
]

const SOURCE_OPTIONS = [
  { value: 'apollo', label: 'Apollo' },
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'other', label: 'Other' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutreachLeadsPage() {
  const supabase = createClient()

  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')

  const pageSize = 25

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('mc_outreach_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterSource) query = query.eq('source', filterSource)

    const { data, count, error } = await query

    if (!error && data) {
      setLeads(data as Lead[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [page, filterStatus, filterSource]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleCreate = async (formData: Record<string, unknown>) => {
    const { error } = await supabase.from('mc_outreach_leads').insert({
      first_name: formData.first_name,
      last_name: formData.last_name || null,
      email: formData.email,
      phone: formData.phone || null,
      company: formData.company || null,
      title: formData.title || null,
      linkedin_url: formData.linkedin_url || null,
      source: formData.source || 'manual',
      status: formData.status || 'new',
      tags: formData.tags || [],
      notes: formData.notes || null,
    })
    if (error) throw new Error(error.message)
    await fetchLeads()
  }

  type Row = Record<string, unknown>

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Row) => {
        const r = row as unknown as Lead
        return (
          <a
            href={`/outreach/leads/${r.id}`}
            className="hover:underline font-medium"
            style={{ color: 'var(--accent-blue)' }}
          >
            {r.first_name} {r.last_name || ''}
          </a>
        )
      },
    },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Row) => <StatusBadge status={(row.status as string) || 'new'} />,
    },
    { key: 'source', label: 'Source' },
    {
      key: 'lead_score',
      label: 'Score',
      render: (row: Row) => String(row.lead_score ?? '—'),
    },
    {
      key: 'last_action_date',
      label: 'Last Action',
      render: (row: Row) =>
        row.last_action_date
          ? new Date(row.last_action_date as string).toLocaleDateString()
          : '—',
    },
  ]

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Outreach', href: '/outreach' },
          { label: 'Leads' },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Outreach Leads
        </h1>
        <button
          type="button"
          className="glass-button glass-button-primary text-sm px-5 py-2"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Create Lead'}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            New Lead
          </h2>
          <GlassForm onSubmit={handleCreate} submitLabel="Create Lead">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name" name="first_name" required placeholder="Jane" />
              <Field label="Last Name" name="last_name" placeholder="Smith" />
              <Field label="Email" name="email" type="email" required placeholder="jane@example.com" />
              <Field label="Phone" name="phone" type="tel" placeholder="+1 555-0123" />
              <Field label="Company" name="company" placeholder="Acme Corp" />
              <Field label="Title" name="title" placeholder="VP of Engineering" />
              <Field
                label="LinkedIn URL"
                name="linkedin_url"
                type="url"
                placeholder="https://linkedin.com/in/janesmith"
              />
              <Select label="Source" name="source" options={SOURCE_OPTIONS} />
              <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue="new" />
              <Field
                label="Tags"
                name="tags"
                placeholder="saas, enterprise, ai"
                dataType="array"
                description="Comma-separated list of tags"
              />
            </div>
            <TextArea label="Notes" name="notes" placeholder="Any relevant notes about this lead..." rows={3} />
          </GlassForm>
        </GlassCard>
      )}

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="filter-status" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Filter by Status
            </label>
            <select
              id="filter-status"
              className="glass-input text-sm"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-source" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Filter by Source
            </label>
            <select
              id="filter-source"
              className="glass-input text-sm"
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setPage(1) }}
            >
              <option value="">All Sources</option>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Data table */}
      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading leads...</p>
        ) : (
          <DataTable
            columns={columns as unknown as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
            rows={leads as unknown as Record<string, unknown>[]}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onRowClick={(row) => { window.location.href = `/outreach/leads/${row.id}` }}
            emptyMessage="No leads found. Create your first lead above."
          />
        )}
      </GlassCard>
    </main>
  )
}
