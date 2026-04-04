import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// GET /api/notifications — List notifications for a recipient
export async function GET(request: NextRequest) {
  if (!authenticate(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ data: [], unread_count: 0, message: 'Database not configured' })

  const { searchParams } = request.nextUrl
  const recipient = searchParams.get('recipient') || 'brandon'
  const limit = parseInt(searchParams.get('limit') || '30', 10)
  const unreadOnly = searchParams.get('unread') === 'true'

  try {
    let query = supabase
      .from('mc_notifications')
      .select('*', { count: 'exact' })
      .eq('recipient', recipient)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) query = query.eq('read', false)

    const { data, count, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Also get unread count
    const { count: unreadCount } = await supabase
      .from('mc_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient', recipient)
      .eq('read', false)

    return NextResponse.json({ data: data || [], count: count || 0, unread_count: unreadCount || 0 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}

// POST /api/notifications — Create a notification
export async function POST(request: NextRequest) {
  if (!authenticate(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  let body: { recipient?: string; title?: string; message?: string; type?: string; link?: string; metadata?: Record<string, unknown> }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  try {
    const { data, error } = await supabase
      .from('mc_notifications')
      .insert({
        recipient: body.recipient || 'brandon',
        title: body.title,
        message: body.message || '',
        type: body.type || 'info',
        link: body.link || null,
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
