import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// POST /api/outreach/leads/import
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leads?: unknown[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.leads) || body.leads.length === 0) {
    return NextResponse.json({ error: 'Request body must include a non-empty "leads" array' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rows = (body.leads as Record<string, unknown>[]).map((lead) => {
      const contact: Record<string, unknown> = {}
      if (lead.first_name || lead.last_name) {
        contact.name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
      }
      if (lead.title) contact.title = lead.title
      if (lead.email) contact.email = lead.email
      if (lead.phone) contact.phone = lead.phone
      if (lead.linkedin_url) contact.linkedin_url = lead.linkedin_url

      return {
        company_name: lead.company_name ?? null,
        website: lead.website ?? null,
        industry: lead.industry ?? null,
        contacts: Object.keys(contact).length > 0 ? [contact] : [],
        lead_score: lead.lead_score ?? 0,
        pipeline_stage: lead.pipeline_stage ?? 'signal',
        notes: lead.notes ?? null,
        source: lead.source ?? null,
        campaign: lead.campaign ?? null,
        tags: lead.tags ?? [],
        city: lead.city ?? null,
        state: lead.state ?? null,
        country: lead.country ?? null,
      }
    })

    const { data, error } = await supabase
      .from('mc_outreach_leads')
      .insert(rows)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ imported: data?.length ?? 0, total: rows.length }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
