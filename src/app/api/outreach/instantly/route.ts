import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v1'

function getApiKey(): string | null {
  return process.env.INSTANTLY_API_KEY ?? null
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
    return NextResponse.json(
      { error: 'Instantly.ai not configured' },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(
      `${INSTANTLY_BASE}/campaign/list?api_key=${apiKey}`,
    )
    const campaigns = await res.json()

    return NextResponse.json({ data: campaigns })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
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
    return NextResponse.json(
      { error: 'Instantly.ai not configured' },
      { status: 503 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action } = body as { action?: string }
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    // ----- create_campaign -----
    if (action === 'create_campaign') {
      const { name, schedule, daily_limit } = body as {
        name?: string
        schedule?: unknown
        daily_limit?: number
      }

      if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
      }

      const res = await fetch(`${INSTANTLY_BASE}/campaign/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          name,
          ...(schedule ? { schedule } : {}),
          ...(daily_limit ? { daily_limit } : {}),
        }),
      })
      const data = await res.json()

      return NextResponse.json({ data }, { status: 201 })
    }

    // ----- add_leads -----
    if (action === 'add_leads') {
      const { campaign_id, lead_ids } = body as {
        campaign_id?: string
        lead_ids?: string[]
      }

      if (!campaign_id || !lead_ids?.length) {
        return NextResponse.json(
          { error: 'campaign_id and lead_ids are required' },
          { status: 400 },
        )
      }

      if (!supabase) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
      }

      const { data: leads, error: leadsErr } = await supabase
        .from('mc_outreach_leads')
        .select('*')
        .in('id', lead_ids)

      if (leadsErr) {
        return NextResponse.json({ error: leadsErr.message }, { status: 500 })
      }

      const instantlyLeads = (leads ?? []).map((lead) => {
        const contacts = (lead.contacts as Record<string, string>[]) ?? []
        const contact = contacts[0] ?? {}
        const fullName = contact.name ?? ''
        const nameParts = fullName.split(' ')

        return {
          email: contact.email ?? '',
          first_name: nameParts[0] ?? '',
          last_name: nameParts.slice(1).join(' ') ?? '',
          company_name: lead.company_name ?? '',
          personalization: `${lead.industry ?? ''} | ${lead.city ?? ''}`,
        }
      })

      const res = await fetch(`${INSTANTLY_BASE}/lead/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          campaign_id,
          skip_if_in_workspace: true,
          leads: instantlyLeads,
        }),
      })
      const data = await res.json()

      // Update leads in database
      await supabase
        .from('mc_outreach_leads')
        .update({ email_sent: true, pipeline_stage: 'campaign' })
        .in('id', lead_ids)

      return NextResponse.json({ data, updated: lead_ids.length })
    }

    // ----- sync_analytics -----
    if (action === 'sync_analytics') {
      const { campaign_id } = body as { campaign_id?: string }

      if (!campaign_id) {
        return NextResponse.json(
          { error: 'campaign_id is required' },
          { status: 400 },
        )
      }

      const res = await fetch(
        `${INSTANTLY_BASE}/analytics/campaign/summary?api_key=${apiKey}&campaign_id=${campaign_id}`,
      )
      const analytics = await res.json()

      // Update campaign record if database is available
      if (supabase) {
        await supabase
          .from('mc_outreach_campaigns')
          .update({
            open_rate: analytics.open_rate ?? null,
            reply_rate: analytics.reply_rate ?? null,
            bounce_rate: analytics.bounce_rate ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('instantly_campaign_id', campaign_id)
      }

      return NextResponse.json({ data: analytics })
    }

    // ----- sync_replies -----
    if (action === 'sync_replies') {
      const { campaign_id } = body as { campaign_id?: string }

      if (!campaign_id) {
        return NextResponse.json(
          { error: 'campaign_id is required' },
          { status: 400 },
        )
      }

      const res = await fetch(
        `${INSTANTLY_BASE}/unibox/emails?api_key=${apiKey}&campaign_id=${campaign_id}`,
      )
      const emails = await res.json()

      if (!supabase) {
        return NextResponse.json({ data: emails })
      }

      let synced = 0
      const replies = Array.isArray(emails) ? emails : emails.data ?? []

      for (const reply of replies) {
        // Insert reply if it doesn't already exist
        const { error: insertErr } = await supabase
          .from('mc_outreach_replies')
          .upsert(
            {
              instantly_id: reply.id,
              campaign_id,
              from_email: reply.from_email ?? reply.from,
              subject: reply.subject ?? '',
              body: reply.body ?? reply.text ?? '',
              received_at: reply.timestamp ?? new Date().toISOString(),
            },
            { onConflict: 'instantly_id' },
          )

        if (!insertErr) {
          synced++

          // Update lead email_replied and reply_sentiment
          if (reply.from_email || reply.from) {
            await supabase
              .from('mc_outreach_leads')
              .update({
                email_replied: true,
                reply_sentiment: reply.sentiment ?? null,
              })
              .contains('contacts', [{ email: reply.from_email ?? reply.from }])
          }
        }
      }

      return NextResponse.json({ data: replies, synced })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
