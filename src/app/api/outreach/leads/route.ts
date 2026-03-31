import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/outreach/leads
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') ?? undefined
  const source = searchParams.get('source') ?? undefined
  const campaign = searchParams.get('campaign') ?? undefined
  const search = searchParams.get('search') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: [], count: 0, message: 'Database not configured' })
  }

  try {
    let query = supabase
      .from('mc_outreach_leads')
      .select('*', { count: 'exact' })

    if (status) {
      query = query.eq('pipeline_stage', status)
    }
    if (source) {
      query = query.eq('source', source)
    }
    if (campaign) {
      query = query.eq('campaign', campaign)
    }
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,contacts->0->>name.ilike.%${search}%,contacts->0->>email.ilike.%${search}%`
      )
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, count })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/outreach/leads
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const contact: Record<string, unknown> = {}
    if (body.first_name || body.last_name) {
      contact.name = [body.first_name, body.last_name].filter(Boolean).join(' ')
    }
    if (body.title) contact.title = body.title
    if (body.email) contact.email = body.email
    if (body.phone) contact.phone = body.phone
    if (body.linkedin_url) contact.linkedin_url = body.linkedin_url

    const row: Record<string, unknown> = {
      company_name: body.company_name ?? null,
      website: body.website ?? null,
      industry: body.industry ?? null,
      contacts: Object.keys(contact).length > 0 ? [contact] : [],
      lead_score: body.lead_score ?? 0,
      pipeline_stage: body.pipeline_stage ?? 'signal',
      notes: body.notes ?? null,
      source: body.source ?? null,
      campaign: body.campaign ?? null,
      tags: body.tags ?? [],
      city: body.city ?? null,
      state: body.state ?? null,
      country: body.country ?? null,
    }

    const { data, error } = await supabase
      .from('mc_outreach_leads')
      .insert(row)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
