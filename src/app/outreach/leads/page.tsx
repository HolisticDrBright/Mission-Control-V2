'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

// ---------------------------------------------------------------------------
// Types — matches mc_outreach_leads table
// ---------------------------------------------------------------------------

interface Contact {
  name?: string
  email?: string
  title?: string
  linkedin_url?: string
}

interface Lead {
  lead_id: string
  company_name: string
  contacts: Contact[]
  pipeline_stage: string
  lead_score: number
  signal_type: string
  signal_strength: string
  source: string
  campaign: string
  city: string
  state: string
  country: string
  industry: string
  notes: string
  personalization_brief: string
  email_sent: boolean
  email_replied: boolean
  meeting_booked: boolean
  reply_sentiment: string
  last_action_date: string
  date_detected: string
  created_at: string
  // Flat contact helpers (computed)
  _name?: string
  _email?: string
  _title?: string
}

// Extract primary contact from contacts array
function primaryContact(lead: Lead): Contact {
  const contacts = lead.contacts || []
  return contacts[0] || {}
}

function leadName(lead: Lead): string {
  const c = primaryContact(lead)
  return c.name || lead.company_name || '—'
}

function leadEmail(lead: Lead): string {
  const c = primaryContact(lead)
  return c.email || '—'
}

function leadTitle(lead: Lead): string {
  const c = primaryContact(lead)
  return c.title || '—'
}

const STAGE_OPTIONS = [
  { value: 'signal', label: 'Signal' },
  { value: 'enriched', label: 'Enriched' },
  { value: 'email_found', label: 'Email Found' },
  { value: 'validated', label: 'Validated' },
  { value: 'campaign', label: 'In Campaign' },
  { value: 'replied', label: 'Replied' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'closed', label: 'Closed' },
]

const SOURCE_OPTIONS = [
  { value: 'apollo', label: 'Apollo' },
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
]

const CAMPAIGN_OPTIONS = [
  { value: 'd-spiked', label: 'D-Spiked' },
  { value: 'corporate-wellness', label: 'Corporate Wellness' },
  { value: 'ceo-optimization', label: 'CEO Optimization' },
  { value: 'longevity-funnel', label: 'Longevity Funnel' },
  { value: 'weight-loss', label: 'Weight Loss' },
  { value: 'jv-partners', label: 'JV Partners' },
  { value: 'other', label: 'Other' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutreachLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStage, setFilterStage] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterCampaign, setFilterCampaign] = useState('')

  const pageSize = 25

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('mc_outreach_leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (filterStage) query = query.eq('pipeline_stage', filterStage)
      if (filterSource) query = query.eq('source', filterSource)
      if (filterCampaign) query = query.eq('campaign', filterCampaign)

      const { data, count, error } = await query

      if (!error && data) {
        setLeads(data as Lead[])
        setTotal(count ?? 0)
      } else {
        setLeads([])
        setTotal(0)
      }
    } catch {
      setLeads([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, filterStage, filterSource, filterCampaign])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleCreate = async (formData: Record<string, unknown>) => {
    const res = await fetch('/api/outreach/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: formData.company || '',
        contacts: [{
          name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim(),
          email: formData.email || '',
          title: formData.title || '',
          linkedin_url: formData.linkedin_url || '',
        }],
        pipeline_stage: formData.pipeline_stage || 'signal',
        lead_score: parseInt(String(formData.lead_score || '50'), 10),
        signal_type: formData.source || 'manual',
        signal_strength: 'warm',
        source: formData.source || 'manual',
        campaign: formData.campaign || null,
        city: formData.city || null,
        state: formData.state || null,
        country: 'US',
        notes: formData.notes || null,
        personalization_brief: formData.notes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create lead')
    }
    setShowForm(false)
    await fetchLeads()
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Record<string, unknown>) => {
        const lead = row as unknown as Lead
        return (
          <a
            href={`/outreach/leads/${lead.lead_id}`}
            className="hover:underline font-medium"
            style={{ color: 'var(--accent-blue)' }}
          >
            {leadName(lead)}
          </a>
        )
      },
    },
    {
      key: 'company_name',
      label: 'Company',
      render: (row: Record<string, unknown>) => String((row as unknown as Lead).company_name || '—'),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row: Record<string, unknown>) => leadEmail(row as unknown as Lead),
    },
    {
      key: 'title',
      label: 'Title',
      render: (row: Record<string, unknown>) => leadTitle(row as unknown as Lead),
    },
    {
      key: 'pipeline_stage',
      label: 'Stage',
      render: (row: Record<string, unknown>) => <StatusBadge status={String((row as unknown as Lead).pipeline_stage || 'signal')} />,
    },
    {
      key: 'source',
      label: 'Source',
      render: (row: Record<string, unknown>) => String((row as unknown as Lead).source || (row as unknown as Lead).signal_type || '—'),
    },
    {
      key: 'campaign',
      label: 'Campaign',
      render: (row: Record<string, unknown>) => String((row as unknown as Lead).campaign || '—'),
    },
    {
      key: 'lead_score',
      label: 'Score',
      render: (row: Record<string, unknown>) => {
        const score = (row as unknown as Lead).lead_score
        const color = score >= 75 ? 'var(--accent-emerald)' : score >= 50 ? 'var(--accent-amber)' : 'var(--text-muted)'
        return <span style={{ color }}>{score ?? '—'}</span>
      },
    },
    {
      key: 'created_at',
      label: 'Added',
      render: (row: Record<string, unknown>) => {
        const d = (row as unknown as Lead).created_at || (row as unknown as Lead).date_detected
        return d ? new Date(d).toLocaleDateString() : '—'
      },
    },
  ]

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'Outreach', href: '/outreach' }, { label: 'Leads' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Outreach Leads <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({total})</span>
        </h1>
        <div className="flex gap-2">
          <a href="/outreach/leads/new" className="glass-button glass-button-primary text-sm px-5 py-2">
            + Add Lead
          </a>
          <button
            type="button"
            className="glass-button text-sm px-4 py-2"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Quick Add'}
          </button>
        </div>
      </div>

      {/* Quick create form */}
      {showForm && (
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick Add Lead</h2>
          <GlassForm onSubmit={handleCreate} submitLabel="Create Lead">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="First Name" name="first_name" required placeholder="Jane" />
              <Field label="Last Name" name="last_name" placeholder="Smith" />
              <Field label="Email" name="email" type="email" placeholder="jane@example.com" />
              <Field label="Company" name="company" required placeholder="Acme Corp" />
              <Field label="Title" name="title" placeholder="VP of Engineering" />
              <Field label="Phone" name="phone" type="tel" placeholder="+1 555-0123" />
              <Field label="LinkedIn URL" name="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." />
              <Field label="City" name="city" placeholder="Austin" />
              <Field label="State" name="state" placeholder="TX" />
              <Select label="Source" name="source" options={SOURCE_OPTIONS} defaultValue="manual" />
              <Select label="Stage" name="pipeline_stage" options={STAGE_OPTIONS} defaultValue="signal" />
              <Select label="Campaign" name="campaign" options={CAMPAIGN_OPTIONS} />
              <Field label="Lead Score" name="lead_score" type="number" placeholder="50" dataType="number" />
            </div>
            <TextArea label="Notes" name="notes" placeholder="Any relevant notes..." rows={2} />
          </GlassForm>
        </GlassCard>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="filter-stage" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Pipeline Stage
            </label>
            <select id="filter-stage" className="glass-input text-sm" value={filterStage} onChange={(e) => { setFilterStage(e.target.value); setPage(1) }}>
              <option value="">All Stages</option>
              {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-source" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Source
            </label>
            <select id="filter-source" className="glass-input text-sm" value={filterSource} onChange={(e) => { setFilterSource(e.target.value); setPage(1) }}>
              <option value="">All Sources</option>
              {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-campaign" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Campaign
            </label>
            <select id="filter-campaign" className="glass-input text-sm" value={filterCampaign} onChange={(e) => { setFilterCampaign(e.target.value); setPage(1) }}>
              <option value="">All Campaigns</option>
              {CAMPAIGN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Data table */}
      <GlassCard className="p-5">
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading leads...</p>
        ) : (
          <DataTable
            columns={columns}
            rows={leads as unknown as Record<string, unknown>[]}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onRowClick={(row) => { window.location.href = `/outreach/leads/${(row as unknown as Lead).lead_id}` }}
            emptyMessage="No leads found. Click '+ Add Lead' to create your first lead."
          />
        )}
      </GlassCard>
    </main>
  )
}
