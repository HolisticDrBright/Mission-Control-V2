import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// POST /api/outreach/personalize
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

  const { lead_id, template_id } = body as { lead_id?: string; template_id?: string }

  if (!lead_id || !template_id) {
    return NextResponse.json(
      { error: 'lead_id and template_id are required' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // Fetch lead
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

    // Fetch template
    const { data: template, error: tplErr } = await supabase
      .from('mc_outreach_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (tplErr || !template) {
      return NextResponse.json(
        { error: tplErr?.message ?? 'Template not found' },
        { status: 404 },
      )
    }

    // Extract primary contact
    const contacts = (lead.contacts as Record<string, string>[]) ?? []
    const contact = contacts[0] ?? {}

    const fullName = contact.name ?? ''
    const nameParts = fullName.split(' ')
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.slice(1).join(' ') ?? ''

    // Variable replacement map
    const vars: Record<string, string> = {
      '{{first_name}}': firstName,
      '{{last_name}}': lastName,
      '{{full_name}}': fullName,
      '{{email}}': contact.email ?? '',
      '{{company}}': lead.company_name ?? '',
      '{{company_name}}': lead.company_name ?? '',
      '{{title}}': contact.title ?? '',
      '{{city}}': lead.city ?? '',
      '{{state}}': lead.state ?? '',
      '{{industry}}': lead.industry ?? '',
      '{{campaign}}': lead.campaign ?? '',
    }

    let subject: string = template.subject ?? ''
    let bodyText: string = template.body ?? ''

    for (const [token, value] of Object.entries(vars)) {
      subject = subject.replaceAll(token, value)
      bodyText = bodyText.replaceAll(token, value)
    }

    return NextResponse.json({
      data: {
        subject,
        body: bodyText,
        lead_id,
        template_id,
        personalized_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
