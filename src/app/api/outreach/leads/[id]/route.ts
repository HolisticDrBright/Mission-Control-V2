import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/outreach/leads/[id]
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: null, message: 'Database not configured' })
  }

  try {
    const { data, error } = await supabase
      .from('mc_outreach_leads')
      .select('*')
      .eq('lead_id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PUT /api/outreach/leads/[id]
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

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
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Map direct columns
    const directFields = [
      'company_name', 'website', 'industry', 'contacts', 'lead_score',
      'pipeline_stage', 'notes', 'source', 'campaign', 'tags',
      'city', 'state', 'country',
    ]
    for (const field of directFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    // If contact-level fields are provided, rebuild the contacts array
    if (body.first_name || body.last_name || body.email || body.phone || body.title || body.linkedin_url) {
      const contact: Record<string, unknown> = {}
      if (body.first_name || body.last_name) {
        contact.name = [body.first_name, body.last_name].filter(Boolean).join(' ')
      }
      if (body.title) contact.title = body.title
      if (body.email) contact.email = body.email
      if (body.phone) contact.phone = body.phone
      if (body.linkedin_url) contact.linkedin_url = body.linkedin_url
      updates.contacts = [contact]
    }

    const { data, error } = await supabase
      .from('mc_outreach_leads')
      .update(updates)
      .eq('lead_id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/outreach/leads/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { error } = await supabase
      .from('mc_outreach_leads')
      .delete()
      .eq('lead_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
