import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'
import { notify } from '@/lib/notifications'

// GET /api/chat — List messages with pagination
export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: [], count: 0, message: 'Database not configured' })
  }

  const { searchParams } = request.nextUrl
  const channel = searchParams.get('channel') || 'general'
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const before = searchParams.get('before') // cursor-based: load older messages

  try {
    let query = supabase
      .from('mc_chat_messages')
      .select('*', { count: 'exact' })
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reverse so oldest is first (chat order)
    return NextResponse.json({
      data: (data || []).reverse(),
      count: count || 0,
      channel,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

// POST /api/chat — Send a message
export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: { sender?: string; message?: string; channel?: string; metadata?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.sender || !body.message) {
    return NextResponse.json({ error: 'sender and message are required' }, { status: 400 })
  }

  const validSenders = ['brandon', 'openclaw', 'cowork', 'system']
  if (!validSenders.includes(body.sender)) {
    return NextResponse.json({ error: `Invalid sender. Must be one of: ${validSenders.join(', ')}` }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('mc_chat_messages')
      .insert({
        sender: body.sender,
        message: body.message,
        channel: body.channel || 'general',
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-notify Brandon when OpenClaw or Cowork posts
    if (body.sender !== 'brandon') {
      notify({
        recipient: 'brandon',
        title: `New message from ${body.sender}`,
        message: body.message!.substring(0, 100),
        type: 'chat',
        link: `/chat`,
        metadata: { channel: body.channel, sender: body.sender },
      })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
