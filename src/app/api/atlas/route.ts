import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const action = searchParams.get('action')

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    if (action === 'messages') {
      const channel = searchParams.get('channel') || undefined
      const limit = parseInt(searchParams.get('limit') || '20', 10)

      let query = supabase
        .from('mc_chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (channel) query = query.eq('channel', channel)

      const { data: messages } = await query
      return NextResponse.json({ status: 'ok', messages: messages || [] })
    }

    if (action === 'status') {
      const [
        { count: chatCount },
        { count: leadsCount },
        { count: blogCount },
        { count: keywordsCount },
        { count: alertsCount },
        { count: notifCount },
        { count: tasksCount },
        { count: vaTasksCount },
      ] = await Promise.all([
        supabase.from('mc_chat_messages').select('*', { count: 'exact', head: true }),
        supabase.from('mc_outreach_leads').select('*', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
        supabase.from('keywords').select('*', { count: 'exact', head: true }),
        supabase.from('mc_alerts').select('*', { count: 'exact', head: true }).eq('acknowledged', false),
        supabase.from('mc_notifications').select('*', { count: 'exact', head: true }).eq('read', false),
        supabase.from('tasks').select('*', { count: 'exact', head: true }),
        supabase.from('va_tasks').select('*', { count: 'exact', head: true }),
      ])

      return NextResponse.json({
        status: 'ok',
        system: {
          uptime_seconds: Math.floor(process.uptime()),
          memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          timestamp: new Date().toISOString(),
        },
        data: {
          chat_messages: chatCount || 0,
          outreach_leads: leadsCount || 0,
          blog_posts: blogCount || 0,
          keywords: keywordsCount || 0,
          unread_alerts: alertsCount || 0,
          unread_notifications: notifCount || 0,
          tasks: tasksCount || 0,
          va_tasks: vaTasksCount || 0,
        },
      })
    }

    if (action === 'notifications') {
      const { data } = await supabase
        .from('mc_notifications')
        .select('*')
        .eq('recipient', 'brandon')
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10)

      return NextResponse.json({ status: 'ok', notifications: data || [] })
    }

    if (action === 'leads') {
      const limit = parseInt(searchParams.get('limit') || '25', 10)
      const stage = searchParams.get('stage') || undefined

      let query = supabase
        .from('mc_outreach_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (stage) query = query.eq('pipeline_stage', stage)

      const { data } = await query
      return NextResponse.json({ status: 'ok', leads: data || [] })
    }

    return NextResponse.json({ error: 'Unknown action. Use: messages, status, notifications, leads' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: { action?: string; message?: string; channel?: string; title?: string; type?: string; link?: string; metadata?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    if (body.action === 'post-message') {
      if (!body.message) {
        return NextResponse.json({ error: 'message required' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('mc_chat_messages')
        .insert({
          sender: 'atlas',
          message: body.message,
          channel: body.channel || 'general',
          metadata: body.metadata || {},
        })
        .select()
        .single()

      if (error) throw error

      // Notify Brandon
      notify({
        recipient: 'brandon',
        title: 'New message from Atlas',
        message: body.message.substring(0, 100),
        type: 'chat',
        link: '/chat',
      })

      return NextResponse.json({ status: 'ok', message_id: data?.id })
    }

    if (body.action === 'create-notification') {
      if (!body.title) {
        return NextResponse.json({ error: 'title required' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('mc_notifications')
        .insert({
          recipient: 'brandon',
          title: body.title,
          message: body.message || '',
          type: body.type || 'info',
          link: body.link || null,
          metadata: body.metadata || {},
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ status: 'ok', notification_id: data?.id })
    }

    if (body.action === 'create-alert') {
      const { data, error } = await supabase
        .from('mc_alerts')
        .insert({
          system: body.type || 'system',
          severity: 'info',
          issue: body.title || body.message || 'Alert from Atlas',
          action_needed: body.message || null,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ status: 'ok', alert_id: data?.id })
    }

    return NextResponse.json({ error: 'Unknown action. Use: post-message, create-notification, create-alert' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
