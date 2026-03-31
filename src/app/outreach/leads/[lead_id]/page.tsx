'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
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
  contacts: Array<{ name?: string; email?: string; role?: string }>
  created_at: string
  updated_at: string
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

export default function LeadDetailPage() {
  const params = useParams()
  const leadId = params.lead_id as string
  const supabase = createClient()

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')

  const fetchLead = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('mc_outreach_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!error && data) {
      setLead(data as Lead)
    }
    setLoading(false)
  }, [leadId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  const handleSave = async (formData: Record<string, unknown>) => {
    const { error } = await supabase
      .from('mc_outreach_leads')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        title: formData.title || null,
        linkedin_url: formData.linkedin_url || null,
        source: formData.source || lead?.source,
        status: formData.status || lead?.status,
        tags: formData.tags || [],
        notes: formData.notes || null,
      })
      .eq('id', leadId)

    if (error) throw new Error(error.message)
    await fetchLead()
  }

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('mc_outreach_leads')
      .update({ status: newStatus, last_action_date: new Date().toISOString() })
      .eq('id', leadId)

    if (error) {
      setStatusMessage(`Error: ${error.message}`)
    } else {
      setStatusMessage(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
      await fetchLead()
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading lead...</p>
      </main>
    )
  }

  if (!lead) {
    return (
      <main className="p-6 max-w-5xl mx-auto">
        <p className="text-sm" style={{ color: 'var(--accent-rose)' }}>Lead not found.</p>
      </main>
    )
  }

  const contacts = Array.isArray(lead.contacts) ? lead.contacts : []

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Outreach', href: '/outreach' },
          { label: 'Leads', href: '/outreach/leads' },
          { label: lead.company || `${lead.first_name} ${lead.last_name}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {lead.first_name} {lead.last_name || ''}
        </h1>
        <StatusBadge status={lead.status || 'new'} />
      </div>

      {/* Lead overview */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Lead Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Email</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{lead.email || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Phone</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{lead.phone || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Company</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{lead.company || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Title</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{lead.title || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Source</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{lead.source || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Lead Score</dt>
            <dd style={{ color: 'var(--text-primary)' }}>{lead.lead_score ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>LinkedIn</dt>
            <dd>
              {lead.linkedin_url ? (
                <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--accent-blue)' }}>
                  {lead.linkedin_url}
                </a>
              ) : '—'}
            </dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Tags</dt>
            <dd style={{ color: 'var(--text-primary)' }}>
              {Array.isArray(lead.tags) && lead.tags.length > 0 ? lead.tags.join(', ') : '—'}
            </dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Last Action</dt>
            <dd style={{ color: 'var(--text-primary)' }}>
              {lead.last_action_date ? new Date(lead.last_action_date).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="font-medium" style={{ color: 'var(--text-muted)' }}>Created</dt>
            <dd style={{ color: 'var(--text-primary)' }}>
              {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>
      </GlassCard>

      {/* Quick status actions */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Quick Status Change
        </h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`glass-button text-xs px-3 py-1.5 ${lead.status === s.value ? 'glass-button-primary' : ''}`}
              onClick={() => handleStatusChange(s.value)}
              disabled={lead.status === s.value}
            >
              {s.label}
            </button>
          ))}
        </div>
        {statusMessage && (
          <p className="text-xs mt-2" style={{ color: 'var(--accent-emerald)' }}>{statusMessage}</p>
        )}
      </GlassCard>

      {/* Contacts section */}
      {contacts.length > 0 && (
        <GlassCard>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Contacts
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Name</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Email</th>
                <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{c.name || '—'}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{c.email || '—'}</td>
                  <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{c.role || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Activity / Notes */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Notes
        </h2>
        <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
          {lead.notes || 'No notes yet.'}
        </p>
      </GlassCard>

      {/* Edit form */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Edit Lead
        </h2>
        <GlassForm onSubmit={handleSave} submitLabel="Save Changes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First Name" name="first_name" required defaultValue={lead.first_name} />
            <Field label="Last Name" name="last_name" defaultValue={lead.last_name || ''} />
            <Field label="Email" name="email" type="email" required defaultValue={lead.email} />
            <Field label="Phone" name="phone" type="tel" defaultValue={lead.phone || ''} />
            <Field label="Company" name="company" defaultValue={lead.company || ''} />
            <Field label="Title" name="title" defaultValue={lead.title || ''} />
            <Field
              label="LinkedIn URL"
              name="linkedin_url"
              type="url"
              defaultValue={lead.linkedin_url || ''}
            />
            <Select label="Source" name="source" options={SOURCE_OPTIONS} defaultValue={lead.source} />
            <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue={lead.status} />
            <Field
              label="Tags"
              name="tags"
              defaultValue={Array.isArray(lead.tags) ? lead.tags.join(', ') : ''}
              dataType="array"
              description="Comma-separated list of tags"
            />
          </div>
          <TextArea label="Notes" name="notes" defaultValue={lead.notes || ''} rows={4} />
        </GlassForm>
      </GlassCard>
    </main>
  )
}
