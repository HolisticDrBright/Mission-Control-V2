import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import os from 'os'

// GET /api/debug/status — No auth required. Returns full system status for debugging.
export async function GET() {
  const errors: string[] = []
  const startTime = Date.now()

  // Service info
  const service = {
    status: 'running' as const,
    uptime_seconds: Math.round(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1048576 * 10) / 10,
    heap_mb: Math.round(process.memoryUsage().heapUsed / 1048576 * 10) / 10,
    port: parseInt(process.env.PORT || '3001', 10),
    node_version: process.version,
    hostname: os.hostname(),
    platform: os.platform(),
  }

  // Database connection
  const supabase = createAdminClient()
  const dbConnected = !!supabase

  if (!dbConnected) {
    errors.push('Supabase not configured (missing or placeholder credentials)')
  }

  // Helper to safely count rows
  async function count(table: string): Promise<number> {
    if (!supabase) return -1
    try {
      const { count: c, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) { errors.push(`${table}: ${error.message}`); return -1 }
      return c || 0
    } catch (e) {
      errors.push(`${table}: ${e instanceof Error ? e.message : 'query failed'}`)
      return -1
    }
  }

  // Helper to get latest row
  async function latest(table: string, orderCol = 'created_at'): Promise<Record<string, unknown> | null> {
    if (!supabase) return null
    try {
      const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: false }).limit(1)
      if (error || !data?.length) return null
      return data[0]
    } catch { return null }
  }

  // Run all counts in parallel
  const [
    chatCount, blogPostsCount, keywordsCount, trendsCount, articlesCount,
    leadsCount, signalsCount, campaignsCount, repliesCount, templatesCount,
    tasksCount, projectsCount, agentsCount, vaTasksCount, jobsCount,
    inboxCount, alertsCount, notificationsCount, activityCount,
    cashclawCount, costLogCount,
  ] = await Promise.all([
    count('mc_chat_messages'),
    count('blog_posts'),
    count('keywords'),
    count('mc_seo_trends'),
    count('mc_seo_articles'),
    count('mc_outreach_leads'),
    count('mc_outreach_signals'),
    count('mc_outreach_campaigns'),
    count('mc_outreach_replies'),
    count('mc_outreach_templates'),
    count('tasks'),
    count('projects'),
    count('agents'),
    count('va_tasks'),
    count('scheduled_jobs'),
    count('inbox_messages'),
    count('mc_alerts'),
    count('mc_notifications'),
    count('activity_log'),
    count('cashclaw_task_runs'),
    count('mc_cost_log'),
  ])

  // Get latest chat message
  const latestChat = await latest('mc_chat_messages')
  // Get latest notification
  const latestNotif = await latest('mc_notifications')

  const queryTime = Date.now() - startTime

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    query_time_ms: queryTime,
    service,
    database: {
      connected: dbConnected,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ configured' : '✗ missing',
      service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder' ? '✓ configured' : '✗ missing/placeholder',
    },
    chat: {
      messages_count: chatCount,
      latest_message: latestChat ? {
        sender: latestChat.sender,
        message: String(latestChat.message || '').substring(0, 200),
        created_at: latestChat.created_at,
        channel: latestChat.channel,
      } : null,
      channels: ['general', 'outreach', 'seo', 'cashclaw', 'dev', 'alerts'],
      status: chatCount >= 0 ? 'operational' : 'table_missing',
    },
    seo: {
      blog_posts_count: blogPostsCount,
      keywords_count: keywordsCount,
      trends_count: trendsCount,
      articles_count: articlesCount,
      api_working: blogPostsCount >= 0,
      status: blogPostsCount > 0 ? 'data_loaded' : blogPostsCount === 0 ? 'empty' : 'table_missing',
    },
    outreach: {
      leads_count: leadsCount,
      signals_count: signalsCount,
      campaigns_count: campaignsCount,
      replies_count: repliesCount,
      templates_count: templatesCount,
      status: leadsCount >= 0 ? 'operational' : 'table_missing',
    },
    core: {
      tasks_count: tasksCount,
      projects_count: projectsCount,
      agents_count: agentsCount,
      va_tasks_count: vaTasksCount,
      scheduled_jobs_count: jobsCount,
      inbox_count: inboxCount,
    },
    monitoring: {
      alerts_count: alertsCount,
      notifications_count: notificationsCount,
      activity_log_count: activityCount,
      latest_notification: latestNotif ? {
        title: latestNotif.title,
        type: latestNotif.type,
        created_at: latestNotif.created_at,
      } : null,
    },
    cashclaw: {
      task_runs_count: cashclawCount,
      cost_log_count: costLogCount,
      status: cashclawCount >= 0 ? 'operational' : 'table_missing',
    },
    errors,
  })
}
