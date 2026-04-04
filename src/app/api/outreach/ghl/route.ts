import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

const GHL_BASE = 'https://services.leadconnectorhq.com'

function getGhlConfig() {
  const apiKey = process.env.GHL_API_KEY ?? null
  const locationId = process.env.GHL_LOCATION_ID ?? null
  return { apiKey, locationId }
}

function ghlHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  }
}

// ---------------------------------------------------------------------------
// POST /api/outreach/ghl — Actions
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { apiKey, locationId } = getGhlConfig()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GoHighLevel not configured' },
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
    // ----- push_lead -----
    if (action === 'push_lead') {
      const { lead_id } = body as { lead_id?: string }

      if (!lead_id) {
        return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
      }

      if (!supabase) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
      }

      const { data: lead, error: leadErr } = await supabase
        .from('mc_outreach_leads')
        .select('*')
        .eq('id', lead_id)
        .single()

      if (leadErr || !lead) {
        return NextResponse.json(
          { error: leadErr?.message ?? 'Lead not found' },
          { status: 404 },
        )
      }

      const contacts = (lead.contacts as Record<string, string>[]) ?? []
      const contact = contacts[0] ?? {}
      const fullName = contact.name ?? ''
      const nameParts = fullName.split(' ')

      const ghlContact = {
        firstName: nameParts[0] ?? '',
        lastName: nameParts.slice(1).join(' ') ?? '',
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        companyName: lead.company_name ?? '',
        website: lead.website ?? '',
        address1: lead.city ?? '',
        state: lead.state ?? '',
        country: lead.country ?? '',
        tags: lead.tags ?? [],
        source: 'Mission Control',
        ...(locationId ? { locationId } : {}),
      }

      const res = await fetch(`${GHL_BASE}/contacts/`, {
        method: 'POST',
        headers: ghlHeaders(apiKey),
        body: JSON.stringify(ghlContact),
      })
      const data = await res.json()

      if (res.ok) {
        await supabase
          .from('mc_outreach_leads')
          .update({ last_action: 'pushed_to_ghl' })
          .eq('id', lead_id)
      }

      return NextResponse.json({ data })
    }

    // ----- trigger_workflow -----
    if (action === 'trigger_workflow') {
      const { lead_id, workflow_id } = body as {
        lead_id?: string
        workflow_id?: string
      }

      if (!lead_id || !workflow_id) {
        return NextResponse.json(
          { error: 'lead_id and workflow_id are required' },
          { status: 400 },
        )
      }

      if (!supabase) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
      }

      const { data: lead, error: leadErr } = await supabase
        .from('mc_outreach_leads')
        .select('*')
        .eq('id', lead_id)
        .single()

      if (leadErr || !lead) {
        return NextResponse.json(
          { error: leadErr?.message ?? 'Lead not found' },
          { status: 404 },
        )
      }

      // Get GHL contact ID from lead metadata
      const contactId = (lead.ghl_contact_id as string) ?? ''
      if (!contactId) {
        return NextResponse.json(
          { error: 'Lead has no GHL contact ID. Push to GHL first.' },
          { status: 400 },
        )
      }

      const res = await fetch(
        `${GHL_BASE}/contacts/${contactId}/workflow/${workflow_id}`,
        {
          method: 'POST',
          headers: ghlHeaders(apiKey),
        },
      )
      const data = await res.json()

      // Log activity
      await supabase
        .from('mc_outreach_leads')
        .update({
          last_action: `workflow_${workflow_id}`,
        })
        .eq('id', lead_id)

      return NextResponse.json({ data })
    }

    // ----- sync_pipeline -----
    if (action === 'sync_pipeline') {
      const { pipeline_id } = body as { pipeline_id?: string }

      if (!pipeline_id) {
        return NextResponse.json(
          { error: 'pipeline_id is required' },
          { status: 400 },
        )
      }

      const res = await fetch(
        `${GHL_BASE}/opportunities/pipelines/${pipeline_id}`,
        {
          method: 'GET',
          headers: ghlHeaders(apiKey),
        },
      )
      const data = await res.json()

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
