import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// PATCH /api/notifications/read-all — Mark all notifications as read for a recipient
export async function PATCH(request: NextRequest) {
  if (!authenticate(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  let body: { recipient?: string }
  try { body = await request.json() } catch { body = {} }

  const recipient = body.recipient || 'brandon'

  try {
    const { error } = await supabase
      .from('mc_notifications')
      .update({ read: true })
      .eq('recipient', recipient)
      .eq('read', false)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { marked_all_read: true, recipient } })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
