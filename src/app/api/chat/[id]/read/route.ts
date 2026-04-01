import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// PATCH /api/chat/:id/read — Mark message as read by a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { id } = await params

  let body: { reader?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const reader = body.reader || 'brandon'

  try {
    // Get current read_by
    const { data: msg, error: fetchError } = await supabase
      .from('mc_chat_messages')
      .select('read_by')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const readBy = Array.isArray(msg?.read_by) ? msg.read_by : []
    if (!readBy.includes(reader)) {
      readBy.push(reader)
    }

    const { data, error } = await supabase
      .from('mc_chat_messages')
      .update({ read_by: readBy })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
