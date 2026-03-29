import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// HMAC validation helper
// ---------------------------------------------------------------------------

async function verifyHmacSignature(
  payload: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison via subtle crypto
  const expected = `sha256=${computedHex}`
  if (expected.length !== signature.length) return false

  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}

// ---------------------------------------------------------------------------
// Webhook event schema
// ---------------------------------------------------------------------------

const WebhookEventSchema = z.object({
  event: z.enum([
    'agent.started',
    'agent.completed',
    'agent.failed',
    'agent.heartbeat',
    'task.created',
    'task.updated',
    'task.completed',
    'task.failed',
    'pipeline.stage_completed',
    'pipeline.completed',
    'system.alert',
  ]),
  agent_id: z.string().optional(),
  task_id: z.string().optional(),
  pipeline_id: z.string().optional(),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// POST /api/webhooks  (webhook handler with HMAC validation)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.MC_WEBHOOK_SECRET

  // Read raw body for HMAC verification
  const rawBody = await request.text()

  // Verify HMAC signature if secret is configured
  if (webhookSecret) {
    const signature = request.headers.get('x-signature-256')
      ?? request.headers.get('x-hub-signature-256')

    const valid = await verifyHmacSignature(rawBody, signature, webhookSecret)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 },
      )
    }
  }

  // Parse body
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = WebhookEventSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid webhook payload', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const event = parse.data
  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // Determine entity type and id from the event
  let entityType: string
  let entityId: string | null = null

  if (event.event.startsWith('agent.')) {
    entityType = 'agent'
    entityId = event.agent_id ?? null
  } else if (event.event.startsWith('task.')) {
    entityType = 'task'
    entityId = event.task_id ?? null
  } else if (event.event.startsWith('pipeline.')) {
    entityType = 'pipeline'
    entityId = event.pipeline_id ?? null
  } else {
    entityType = 'system'
  }

  // Insert into activity_log
  const { data: logEntry, error: logError } = await supabase
    .from('activity_log')
    .insert({
      event_type: event.event,
      description: `Webhook event: ${event.event}`,
      entity_type: entityType,
      entity_id: entityId,
      payload: event.payload ?? null,
      created_at: event.timestamp,
    })
    .select()
    .single()

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  // Update relevant entities based on event type
  const now = new Date().toISOString()

  if (event.event === 'agent.heartbeat' && event.agent_id) {
    await supabase
      .from('agents')
      .update({ heartbeat_at: event.timestamp, updated_at: now })
      .eq('id', event.agent_id)
  } else if (event.event === 'agent.started' && event.agent_id) {
    await supabase
      .from('agents')
      .update({ status: 'running', updated_at: now })
      .eq('id', event.agent_id)
  } else if (event.event === 'agent.completed' && event.agent_id) {
    await supabase
      .from('agents')
      .update({ status: 'idle', current_task_id: null, updated_at: now })
      .eq('id', event.agent_id)
  } else if (event.event === 'agent.failed' && event.agent_id) {
    await supabase
      .from('agents')
      .update({ status: 'error', updated_at: now })
      .eq('id', event.agent_id)
  } else if (event.event === 'task.completed' && event.task_id) {
    await supabase
      .from('tasks')
      .update({
        kanban_status: 'done',
        completed_at: event.timestamp,
        outcome_score: (event.payload?.outcome_score as number) || null,
        updated_at: now,
      })
      .eq('id', event.task_id)

    // Log to run_history
    await supabase.from('run_history').insert({
      task_id: event.task_id,
      agent_id: event.agent_id || null,
      status: 'completed',
      ended_at: event.timestamp,
      cost_usd: (event.payload?.cost_usd as number) || 0,
      input_tokens: (event.payload?.input_tokens as number) || 0,
      output_tokens: (event.payload?.output_tokens as number) || 0,
      model_used: (event.payload?.model as string) || null,
      outcome_score: (event.payload?.outcome_score as number) || null,
    })
  } else if (event.event === 'task.failed' && event.task_id) {
    // Increment failure count and check for loops
    const { data: task } = await supabase
      .from('tasks')
      .select('failure_count')
      .eq('id', event.task_id)
      .single()

    const newFailCount = (task?.failure_count || 0) + 1
    const loopDetected = newFailCount >= 3

    await supabase
      .from('tasks')
      .update({
        kanban_status: 'blocked',
        failure_count: newFailCount,
        loop_detected: loopDetected,
        updated_at: now,
      })
      .eq('id', event.task_id)

    // Loop detection: create inbox approval request after 3 failures
    if (loopDetected) {
      await supabase.from('inbox_messages').insert({
        type: 'approval_request',
        from_agent_id: event.agent_id || null,
        task_id: event.task_id,
        subject: `Loop detected: Task failed ${newFailCount} times`,
        body: `Task ${event.task_id} has failed ${newFailCount} consecutive times. Auto-dispatch has been paused pending your review.`,
        requires_action: true,
        action_options: [
          { label: 'Retry', value: 'retry' },
          { label: 'Cancel', value: 'cancel' },
          { label: 'Reassign', value: 'reassign' },
        ],
      })
    }

    // Log to run_history
    await supabase.from('run_history').insert({
      task_id: event.task_id,
      agent_id: event.agent_id || null,
      status: 'failed',
      ended_at: event.timestamp,
      error_message: (event.payload?.error as string) || null,
    })
  }

  return NextResponse.json({
    data: {
      event_id: logEntry.id,
      event_type: event.event,
      entity_type: entityType,
      entity_id: entityId,
      received_at: new Date().toISOString(),
      acknowledged: true,
    },
  }, { status: 200 })
}
