import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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

  // TODO: Route events to appropriate handlers once services are connected
  // For now, log the event and acknowledge
  const processed: Record<string, unknown> = {
    event_id: crypto.randomUUID(),
    event_type: event.event,
    received_at: new Date().toISOString(),
    acknowledged: true,
  }

  // Event-specific mock responses
  switch (event.event) {
    case 'agent.started':
    case 'agent.completed':
    case 'agent.failed':
    case 'agent.heartbeat':
      processed.agent_id = event.agent_id ?? null
      processed.handler = 'agent_event_processor'
      break
    case 'task.created':
    case 'task.updated':
    case 'task.completed':
    case 'task.failed':
      processed.task_id = event.task_id ?? null
      processed.handler = 'task_event_processor'
      break
    case 'pipeline.stage_completed':
    case 'pipeline.completed':
      processed.pipeline_id = event.pipeline_id ?? null
      processed.handler = 'pipeline_event_processor'
      break
    case 'system.alert':
      processed.handler = 'alert_processor'
      break
  }

  return NextResponse.json({ data: processed }, { status: 200 })
}
