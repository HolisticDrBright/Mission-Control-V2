import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2'

function getApiKey(): string | null {
  return process.env.INSTANTLY_API_KEY ?? null
}

function instantlyHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

// ---------------------------------------------------------------------------
// GET /api/outreach/instantly — List campaigns
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'Instantly.ai not configured. Set INSTANTLY_API_KEY in .env' }, { status: 503 })
  }

  const { searchParams } = request.nextUrl
  const endpoint = searchParams.get('endpoint') || 'campaigns'

  try {
    if (endpoint === 'campaigns') {
      const res = await fetch(`${INSTANTLY_BASE}/campaigns`, {
        headers: instantlyHeaders(apiKey),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message || `Instantly ${res.status}`, instantly_error: data }, { status: res.status })
      return NextResponse.json({ data })
    }

    if (endpoint === 'emails') {
      const campaignId = searchParams.get('campaign_id') || ''
      const res = await fetch(`${INSTANTLY_BASE}/emails?campaign_id=${campaignId}`, {
        headers: instantlyHeaders(apiKey),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message || `Instantly ${res.status}` }, { status: res.status })
      return NextResponse.json({ data })
    }

    if (endpoint === 'analytics') {
      const campaignId = searchParams.get('campaign_id') || ''
      const res = await fetch(`${INSTANTLY_BASE}/campaigns/${campaignId}/analytics`, {
        headers: instantlyHeaders(apiKey),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message || `Instantly ${res.status}` }, { status: res.status })
      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: 'Unknown endpoint. Use: campaigns, emails, analytics' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Instantly API call failed' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/outreach/instantly — Actions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'Instantly.ai not configured. Set INSTANTLY_API_KEY in .env' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action as string
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    // ----- create_campaign -----
    if (action === 'create_campaign') {
      const { name, schedule, daily_limit } = body as { name?: string; schedule?: unknown; daily_limit?: number }
      if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

      const res = await fetch(`${INSTANTLY_BASE}/campaigns`, {
        method: 'POST',
        headers: instantlyHeaders(apiKey),
        body: JSON.stringify({ name, ...(schedule ? { schedule } : {}), ...(daily_limit ? { daily_limit } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message || 'Failed to create campaign', instantly_error: data }, { status: res.status })

      return NextResponse.json({ data }, { status: 201 })
    }

    // ----- add_leads -----
    if (action === 'add_leads') {
      const { campaign_id, lead_ids } = body as { campaign_id?: string; lead_ids?: string[] }
      if (!campaign_id || !lead_ids?.length) return NextResponse.json({ error: 'campaign_id and lead_ids are required' }, { status: 400 })
      if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

      // Fetch leads from DB
      const { data: leads, error: leadsErr } = await supabase
        .from('mc_outreach_leads')
        .select('*')
        .in('lead_id', lead_ids)

      if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 })

      const instantlyLeads = (leads ?? []).map((lead) => {
        const contacts = (lead.contacts as Array<Record<string, string>>) ?? []
        const contact = contacts[0] ?? {}
        const nameParts = (contact.name ?? '').split(' ')
        return {
          email: contact.email ?? '',
          first_name: nameParts[0] ?? '',
          last_name: nameParts.slice(1).join(' ') ?? '',
          company_name: lead.company_name ?? '',
          personalization: lead.personalization_brief ?? `${lead.industry ?? ''} ${lead.city ?? ''}`.trim(),
        }
      }).filter(l => l.email) // Only send leads with emails

      if (instantlyLeads.length === 0) {
        return NextResponse.json({ error: 'No leads with email addresses found' }, { status: 400 })
      }

      const res = await fetch(`${INSTANTLY_BASE}/leads`, {
        method: 'POST',
        headers: instantlyHeaders(apiKey),
        body: JSON.stringify({ campaign_id, leads: instantlyLeads }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.message || 'Failed to add leads', instantly_error: data }, { status: res.status })

      // Update leads in DB
      await supabase
        .from('mc_outreach_leads')
        .update({ email_sent: true, pipeline_stage: 'campaign', last_action: 'added_to_instantly', last_action_date: new Date().toISOString() })
        .in('lead_id', lead_ids)

      return NextResponse.json({ data, leads_added: instantlyLeads.length })
    }

    // ----- sync_analytics -----
    if (action === 'sync_analytics') {
      const { campaign_id } = body as { campaign_id?: string }
      if (!campaign_id) return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })

      const res = await fetch(`${INSTANTLY_BASE}/campaigns/${campaign_id}/analytics`, {
        headers: instantlyHeaders(apiKey),
      })
      const analytics = await res.json()
      if (!res.ok) return NextResponse.json({ error: analytics.message || 'Failed to get analytics' }, { status: res.status })

      // Update campaign record
      if (supabase) {
        await supabase
          .from('mc_outreach_campaigns')
          .update({
            open_rate: analytics.open_rate ?? null,
            reply_rate: analytics.reply_rate ?? null,
            bounce_rate: analytics.bounce_rate ?? null,
            emails_sent: analytics.emails_sent ?? null,
            opens: analytics.opens ?? null,
            replies: analytics.replies ?? null,
          })
          .eq('id', campaign_id)
      }

      return NextResponse.json({ data: analytics })
    }

    // ----- sync_replies -----
    if (action === 'sync_replies') {
      const { campaign_id } = body as { campaign_id?: string }
      if (!campaign_id) return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })

      const res = await fetch(`${INSTANTLY_BASE}/emails?campaign_id=${campaign_id}&type=received`, {
        headers: instantlyHeaders(apiKey),
      })
      const emailsData = await res.json()
      if (!res.ok) return NextResponse.json({ error: emailsData.message || 'Failed to get emails' }, { status: res.status })

      if (!supabase) return NextResponse.json({ data: emailsData })

      const replies = Array.isArray(emailsData) ? emailsData : emailsData.data ?? []
      let synced = 0

      for (const reply of replies) {
        const { error: insertErr } = await supabase
          .from('mc_outreach_replies')
          .insert({
            lead_name: reply.from_name ?? reply.from ?? '',
            company: '',
            category: 'not_interested',
            snippet: (reply.body ?? reply.text ?? '').substring(0, 300),
            received_at: reply.timestamp ?? new Date().toISOString(),
          })

        if (!insertErr) synced++

        // Update lead
        if (reply.from_email || reply.from) {
          await supabase
            .from('mc_outreach_leads')
            .update({ email_replied: true })
            .contains('contacts', [{ email: reply.from_email ?? reply.from }])
        }
      }

      return NextResponse.json({ data: replies, synced })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Instantly API call failed' }, { status: 500 })
  }
}
