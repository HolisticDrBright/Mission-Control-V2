'use client'

import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import GlassCard from '@/components/ui/GlassCard'
import { Breadcrumbs } from '@/components/ui/FormComponents'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_OPTIONS = [
  { value: 'apollo', label: 'Apollo' },
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'website', label: 'Website' },
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

const CAMPAIGN_OPTIONS = [
  { value: 'd-spiked', label: 'D-Spiked' },
  { value: 'corporate-wellness', label: 'Corporate Wellness' },
  { value: 'ceo-optimization', label: 'CEO Optimization' },
  { value: 'longevity-funnel', label: 'Longevity Funnel' },
  { value: 'weight-loss', label: 'Weight Loss' },
  { value: 'jv-partners', label: 'JV Partners' },
  { value: 'other', label: 'Other' },
]

const STATUS_TO_PIPELINE: Record<string, string> = {
  new: 'signal',
  researching: 'enriched',
  contacted: 'campaign',
  replied: 'replied',
  meeting_booked: 'meeting',
  converted: 'closed',
  dead: 'signal',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewLeadPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [csvStatus, setCsvStatus] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('submitting')
    setMessage('')

    const form = e.currentTarget
    const fd = new FormData(form)

    const firstName = fd.get('first_name') as string
    const lastName = fd.get('last_name') as string
    const email = fd.get('email') as string
    const phone = fd.get('phone') as string
    const company = fd.get('company') as string
    const title = fd.get('title') as string
    const linkedinUrl = fd.get('linkedin_url') as string
    const city = fd.get('city') as string
    const state = fd.get('state') as string
    const source = fd.get('source') as string
    const leadStatus = (fd.get('status') as string) || 'new'
    const campaign = fd.get('campaign') as string
    const tagsRaw = fd.get('tags') as string
    const notes = fd.get('notes') as string
    const leadScore = parseInt(fd.get('lead_score') as string, 10) || 50

    const tags = tagsRaw
      ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
      : []

    const contact = {
      name: `${firstName} ${lastName}`.trim(),
      title: title || undefined,
      email: email || undefined,
      linkedin_url: linkedinUrl || undefined,
    }

    // Derive a website from linkedin or company name
    let website = ''
    if (linkedinUrl) {
      website = linkedinUrl
    } else if (company) {
      website = `https://${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    }

    const row = {
      company_name: company,
      contacts: [contact],
      pipeline_stage: STATUS_TO_PIPELINE[leadStatus] || 'signal',
      lead_score: leadScore,
      city: city || null,
      state: state || null,
      country: 'US',
      notes: notes || null,
      website: website || null,
      personalization_brief: notes || null,
      source: source || 'manual',
      campaign: campaign || null,
      tags: tags.length > 0 ? tags : null,
      industry: null,
      first_name: firstName,
      last_name: lastName || null,
      email: email || null,
      phone: phone || null,
      title: title || null,
      linkedin_url: linkedinUrl || null,
      status: leadStatus,
    }

    try {
      const res = await fetch('/api/outreach/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      setStatus('success')
      setMessage('Lead created successfully! Redirecting...')
      setTimeout(() => router.push('/outreach/leads'), 1500)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to create lead')
    }
  }

  const handleCsvImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvStatus('Parsing CSV...')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) {
        setCsvStatus('Error: CSV must have a header row and at least one data row.')
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
          obj[h] = values[i] || ''
        })
        return obj
      })

      const mapped = rows.map((r) => {
        const firstName = r['first_name'] || r['first name'] || r['firstname'] || ''
        const lastName = r['last_name'] || r['last name'] || r['lastname'] || ''
        const emailVal = r['email'] || ''
        const titleVal = r['title'] || r['role'] || ''
        const companyVal = r['company'] || r['company_name'] || ''

        return {
          company_name: companyVal,
          first_name: firstName,
          last_name: lastName,
          email: emailVal || null,
          phone: r['phone'] || null,
          title: titleVal || null,
          linkedin_url: r['linkedin_url'] || r['linkedin'] || null,
          city: r['city'] || null,
          state: r['state'] || null,
          country: 'US',
          source: r['source'] || 'manual',
          status: 'new',
          pipeline_stage: 'signal',
          lead_score: parseInt(r['lead_score'] || '50', 10),
          contacts: [
            {
              name: `${firstName} ${lastName}`.trim(),
              title: titleVal || undefined,
              email: emailVal || undefined,
            },
          ],
          notes: r['notes'] || null,
          personalization_brief: r['notes'] || null,
        }
      })

      const res = await fetch('/api/outreach/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: mapped }),
      })

      if (res.ok) {
        const result = await res.json()
        setCsvStatus(`Imported ${result.imported ?? mapped.length} of ${mapped.length} leads.`)
      } else {
        const errData = await res.json().catch(() => ({}))
        setCsvStatus(`Import failed: ${errData.error || `HTTP ${res.status}`}. Trying one-by-one...`)
        // Fallback: insert one-by-one via API
        let imported = 0
        for (const lead of mapped) {
          const singleRes = await fetch('/api/outreach/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
          })
          if (singleRes.ok) imported++
        }
        setCsvStatus(`Imported ${imported} of ${mapped.length} leads.`)
      }
    } catch (err) {
      setCsvStatus(
        `Error: ${err instanceof Error ? err.message : 'Failed to import CSV'}`
      )
    }
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Outreach', href: '/outreach' },
          { label: 'Leads', href: '/outreach/leads' },
          { label: 'New Lead' },
        ]}
      />

      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Add New Lead
      </h1>

      {/* Lead creation form */}
      <GlassCard>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                First Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                className="glass-input w-full text-sm"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Last Name <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                required
                className="glass-input w-full text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="glass-input w-full text-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="glass-input w-full text-sm"
              />
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Company <span style={{ color: 'var(--accent-rose)' }}>*</span>
              </label>
              <input
                id="company"
                name="company"
                type="text"
                required
                className="glass-input w-full text-sm"
              />
            </div>

            {/* Title/Role */}
            <div>
              <label htmlFor="title" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Title / Role
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="glass-input w-full text-sm"
              />
            </div>

            {/* LinkedIn URL */}
            <div>
              <label htmlFor="linkedin_url" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                LinkedIn URL
              </label>
              <input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                placeholder="https://linkedin.com/in/..."
                className="glass-input w-full text-sm"
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                className="glass-input w-full text-sm"
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                className="glass-input w-full text-sm"
              />
            </div>

            {/* Source */}
            <div>
              <label htmlFor="source" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Source
              </label>
              <select
                id="source"
                name="source"
                className="glass-input w-full text-sm"
                defaultValue="manual"
              >
                <option value="">-- Select --</option>
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select
                id="status"
                name="status"
                className="glass-input w-full text-sm"
                defaultValue="new"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Campaign */}
            <div>
              <label htmlFor="campaign" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Campaign
              </label>
              <select
                id="campaign"
                name="campaign"
                className="glass-input w-full text-sm"
                defaultValue=""
              >
                <option value="">-- Select --</option>
                {CAMPAIGN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                placeholder="e.g. wellness, CEO, high-value"
                className="glass-input w-full text-sm"
              />
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Comma-separated list of tags
              </p>
            </div>

            {/* Lead Score */}
            <div>
              <label htmlFor="lead_score" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Lead Score
              </label>
              <input
                id="lead_score"
                name="lead_score"
                type="number"
                min={0}
                max={100}
                defaultValue={50}
                className="glass-input w-full text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="glass-input w-full text-sm resize-y"
            />
          </div>

          {/* Status messages */}
          {status === 'success' && (
            <div role="alert" className="p-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-emerald)' }}>
              {message}
            </div>
          )}
          {status === 'error' && (
            <div role="alert" className="p-3 rounded-xl text-sm" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
              {message}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="glass-button glass-button-primary text-sm px-6 py-2"
            >
              {status === 'submitting' ? 'Creating Lead...' : 'Create Lead'}
            </button>
            <button type="reset" className="glass-button text-sm px-4 py-2">
              Reset
            </button>
          </div>
        </form>
      </GlassCard>

      {/* CSV Import Section */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          CSV Import
        </h2>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Upload a CSV with columns: first_name, last_name, email, phone, company, title, linkedin_url, city, state, source, notes, lead_score
        </p>
        <div className="flex items-center gap-3">
          <label htmlFor="csv_file" className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            CSV File
          </label>
          <input
            id="csv_file"
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        {csvStatus && (
          <p
            className="text-sm mt-3"
            style={{
              color: csvStatus.startsWith('Error')
                ? 'var(--accent-rose)'
                : 'var(--accent-emerald)',
            }}
          >
            {csvStatus}
          </p>
        )}
      </GlassCard>
    </main>
  )
}
