import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/outreach/sequences — List sequences
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: [], message: 'Database not configured' })
  }

  try {
    const { data, error } = await supabase
      .from('mc_outreach_sequences')
      .select('*')
      .order('created_at', { ascending: false })

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
// POST /api/outreach/sequences — Actions
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

  const { action } = body as { action?: string }
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // ----- create -----
    if (action === 'create') {
      const { name, description, steps } = body as {
        name?: string
        description?: string
        steps?: { template_id: string; delay_days: number; step_number: number }[]
      }

      if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('mc_outreach_sequences')
        .insert({
          name,
          description: description ?? null,
          steps: steps ?? [],
          status: 'active',
          active_leads_count: 0,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data }, { status: 201 })
    }

    // ----- enroll_lead -----
    if (action === 'enroll_lead') {
      const { sequence_id, lead_id } = body as {
        sequence_id?: string
        lead_id?: string
      }

      if (!sequence_id || !lead_id) {
        return NextResponse.json(
          { error: 'sequence_id and lead_id are required' },
          { status: 400 },
        )
      }

      // Fetch sequence
      const { data: sequence, error: seqErr } = await supabase
        .from('mc_outreach_sequences')
        .select('*')
        .eq('id', sequence_id)
        .single()

      if (seqErr || !sequence) {
        return NextResponse.json(
          { error: seqErr?.message ?? 'Sequence not found' },
          { status: 404 },
        )
      }

      const steps = (sequence.steps as { template_id: string; delay_days: number; step_number: number }[]) ?? []

      // Process step 1 (delay_days = 0) immediately
      const firstStep = steps.find((s) => s.delay_days === 0 || s.step_number === 1)
      if (firstStep) {
        // Personalize and queue for send
        const personalizeRes = await fetch(
          new URL('/api/outreach/personalize', request.url),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id,
              template_id: firstStep.template_id,
            }),
          },
        )
        const personalized = await personalizeRes.json()

        // Log the personalized email as queued
        await supabase.from('mc_outreach_activity').insert({
          lead_id,
          sequence_id,
          step_number: firstStep.step_number,
          action: 'email_queued',
          details: personalized.data ?? null,
        })
      }

      // Schedule future steps
      for (const step of steps) {
        if (step.delay_days > 0) {
          const scheduledAt = new Date()
          scheduledAt.setDate(scheduledAt.getDate() + step.delay_days)

          await supabase.from('mc_outreach_scheduled_steps').insert({
            sequence_id,
            lead_id,
            step_number: step.step_number,
            template_id: step.template_id,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
          })
        }
      }

      // Update active_leads_count
      await supabase
        .from('mc_outreach_sequences')
        .update({
          active_leads_count: (sequence.active_leads_count ?? 0) + 1,
          total_enrolled: (sequence.total_enrolled ?? 0) + 1,
        })
        .eq('id', sequence_id)

      // Update lead pipeline stage
      await supabase
        .from('mc_outreach_leads')
        .update({ pipeline_stage: 'campaign' })
        .eq('id', lead_id)

      return NextResponse.json({
        data: {
          sequence_id,
          lead_id,
          enrolled_at: new Date().toISOString(),
          steps_scheduled: steps.filter((s) => s.delay_days > 0).length,
        },
      })
    }

    // ----- execute_step -----
    if (action === 'execute_step') {
      const { sequence_id, lead_id, step_number } = body as {
        sequence_id?: string
        lead_id?: string
        step_number?: number
      }

      if (!sequence_id || !lead_id || step_number === undefined) {
        return NextResponse.json(
          { error: 'sequence_id, lead_id, and step_number are required' },
          { status: 400 },
        )
      }

      // Fetch sequence
      const { data: sequence, error: seqErr } = await supabase
        .from('mc_outreach_sequences')
        .select('*')
        .eq('id', sequence_id)
        .single()

      if (seqErr || !sequence) {
        return NextResponse.json(
          { error: seqErr?.message ?? 'Sequence not found' },
          { status: 404 },
        )
      }

      const steps = (sequence.steps as { template_id: string; delay_days: number; step_number: number }[]) ?? []
      const step = steps.find((s) => s.step_number === step_number)

      if (!step) {
        return NextResponse.json(
          { error: `Step ${step_number} not found in sequence` },
          { status: 404 },
        )
      }

      // Personalize email via internal call
      const personalizeRes = await fetch(
        new URL('/api/outreach/personalize', request.url),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id,
            template_id: step.template_id,
          }),
        },
      )
      const personalized = await personalizeRes.json()

      // If Instantly is configured, push to Instantly
      let instantlyResult = null
      if (process.env.INSTANTLY_API_KEY) {
        try {
          const instantlyRes = await fetch(
            new URL('/api/outreach/instantly', request.url),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add_leads',
                campaign_id: sequence.instantly_campaign_id,
                lead_ids: [lead_id],
              }),
            },
          )
          instantlyResult = await instantlyRes.json()
        } catch {
          // Instantly push is best-effort
        }
      }

      // Log activity
      await supabase.from('mc_outreach_activity').insert({
        lead_id,
        sequence_id,
        step_number,
        action: 'step_executed',
        details: {
          personalized: personalized.data ?? null,
          instantly: instantlyResult,
        },
      })

      return NextResponse.json({
        data: {
          sequence_id,
          lead_id,
          step_number,
          personalized: personalized.data ?? null,
          instantly: instantlyResult,
          executed_at: new Date().toISOString(),
        },
      })
    }

    // ----- pause -----
    if (action === 'pause') {
      const { sequence_id } = body as { sequence_id?: string }

      if (!sequence_id) {
        return NextResponse.json(
          { error: 'sequence_id is required' },
          { status: 400 },
        )
      }

      const { data, error } = await supabase
        .from('mc_outreach_sequences')
        .update({ status: 'paused' })
        .eq('id', sequence_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
