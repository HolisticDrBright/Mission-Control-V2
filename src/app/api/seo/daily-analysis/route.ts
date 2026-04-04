import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'
import { notify } from '@/lib/notifications'

// POST /api/seo/daily-analysis — Run daily SEO analysis, save snapshot, generate alerts
// Designed to be called by cron at 6 AM daily
export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // 1. Fetch intelligence analysis
    const port = process.env.PORT || 3001
    const intelligenceRes = await fetch(`http://localhost:${port}/api/seo/intelligence`)
    if (!intelligenceRes.ok) throw new Error('Failed to fetch intelligence data')
    const intelligence = await intelligenceRes.json()

    const today = new Date().toISOString().split('T')[0]

    // 2. Get last week's snapshot for comparison
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const { data: lastWeekSnapshot } = await supabase
      .from('mc_seo_daily_snapshots')
      .select('*')
      .eq('site', intelligence.site || 'all')
      .lte('date', weekAgo)
      .order('date', { ascending: false })
      .limit(1)

    const prev = lastWeekSnapshot?.[0]

    // 3. Calculate week-over-week changes
    const clicksWow = prev ? ((intelligence.summary.total_clicks - prev.total_clicks) / Math.max(prev.total_clicks, 1)) * 100 : null
    const impressionsWow = prev ? ((intelligence.summary.total_impressions - prev.total_impressions) / Math.max(prev.total_impressions, 1)) * 100 : null
    const positionWow = prev ? prev.avg_position - intelligence.summary.avg_position : null // positive = improved
    const ctrWow = prev ? intelligence.summary.avg_ctr - prev.avg_ctr : null

    // 4. Save daily snapshot
    const snapshot = {
      date: today,
      site: intelligence.site || 'all',
      grade: intelligence.current_grade,
      grade_score: intelligence.grade_score,
      total_clicks: intelligence.summary.total_clicks,
      total_impressions: intelligence.summary.total_impressions,
      avg_ctr: intelligence.summary.avg_ctr,
      avg_position: intelligence.summary.avg_position,
      total_queries: intelligence.summary.total_queries,
      total_pages: intelligence.summary.total_pages,
      striking_distance_keywords: intelligence.opportunities.striking_distance.count,
      high_impression_low_click: intelligence.opportunities.low_ctr.count,
      content_recommendations: intelligence.recommendations,
      clicks_wow_change: clicksWow ? Math.round(clicksWow * 100) / 100 : null,
      impressions_wow_change: impressionsWow ? Math.round(impressionsWow * 100) / 100 : null,
      position_wow_change: positionWow ? Math.round(positionWow * 100) / 100 : null,
      ctr_wow_change: ctrWow ? Math.round(ctrWow * 100) / 100 : null,
    }

    const { error: upsertError } = await supabase
      .from('mc_seo_daily_snapshots')
      .upsert(snapshot, { onConflict: 'date,site' })

    if (upsertError) throw new Error(`Snapshot save failed: ${upsertError.message}`)

    // 5. Generate notifications for significant changes
    const alerts: string[] = []

    if (clicksWow !== null && clicksWow > 20) {
      alerts.push(`Clicks up ${clicksWow.toFixed(0)}% week-over-week!`)
    }
    if (clicksWow !== null && clicksWow < -20) {
      alerts.push(`Clicks down ${Math.abs(clicksWow).toFixed(0)}% week-over-week — investigate`)
    }
    if (positionWow !== null && positionWow > 3) {
      alerts.push(`Average position improved by ${positionWow.toFixed(1)} places!`)
    }
    if (positionWow !== null && positionWow < -3) {
      alerts.push(`Average position dropped ${Math.abs(positionWow).toFixed(1)} places — check rankings`)
    }
    if (intelligence.opportunities.striking_distance.count > 10) {
      alerts.push(`${intelligence.opportunities.striking_distance.count} keywords in striking distance (position 11-30) — optimize these first`)
    }

    // Send notification with daily summary
    const summaryMsg = [
      `SEO Daily Report (${today})`,
      `Grade: ${intelligence.current_grade} (${intelligence.grade_score}/100)`,
      `Clicks: ${intelligence.summary.total_clicks}${clicksWow !== null ? ` (${clicksWow > 0 ? '+' : ''}${clicksWow.toFixed(0)}% WoW)` : ''}`,
      `Impressions: ${intelligence.summary.total_impressions}`,
      `Avg Position: ${intelligence.summary.avg_position}`,
      `Opportunities: ${intelligence.opportunities.striking_distance.count} striking distance, ${intelligence.opportunities.low_ctr.count} low CTR`,
      `Recommendations: ${intelligence.recommendations.length} actions`,
      ...alerts,
    ].join('\n')

    notify({
      recipient: 'brandon',
      title: `SEO Daily: Grade ${intelligence.current_grade} | ${intelligence.summary.total_clicks} clicks`,
      message: summaryMsg,
      type: 'info',
      link: '/seo-automation',
    })

    // 6. Log to activity
    await supabase.from('activity_log').insert({
      event_type: 'seo_daily_analysis',
      entity_type: 'seo',
      description: `SEO daily analysis: Grade ${intelligence.current_grade}, ${intelligence.summary.total_clicks} clicks, ${intelligence.opportunities.striking_distance.count} striking distance keywords`,
      metadata: { grade: intelligence.current_grade, clicks: intelligence.summary.total_clicks },
    })

    // 7. Get historical trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const { data: history } = await supabase
      .from('mc_seo_daily_snapshots')
      .select('date, grade, total_clicks, total_impressions, avg_position, avg_ctr')
      .eq('site', intelligence.site || 'all')
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: true })

    return NextResponse.json({
      status: 'success',
      snapshot,
      week_over_week: {
        clicks_change: clicksWow ? `${clicksWow > 0 ? '+' : ''}${clicksWow.toFixed(1)}%` : 'no baseline',
        impressions_change: impressionsWow ? `${impressionsWow > 0 ? '+' : ''}${impressionsWow.toFixed(1)}%` : 'no baseline',
        position_change: positionWow ? `${positionWow > 0 ? '+' : ''}${positionWow.toFixed(1)} positions` : 'no baseline',
        ctr_change: ctrWow ? `${ctrWow > 0 ? '+' : ''}${ctrWow.toFixed(2)}%` : 'no baseline',
      },
      alerts,
      recommendations: intelligence.recommendations.slice(0, 5),
      history: history || [],
      next_actions: intelligence.improvement_potential.focus_areas,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Daily analysis failed' }, { status: 500 })
  }
}

// GET /api/seo/daily-analysis — Get latest snapshot and history
export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: { snapshots: [], latest: null }, message: 'Database not configured' })
  }

  const { searchParams } = request.nextUrl
  const site = searchParams.get('site') || 'all'
  const days = parseInt(searchParams.get('days') || '30', 10)

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const { data: snapshots } = await supabase
    .from('mc_seo_daily_snapshots')
    .select('*')
    .eq('site', site)
    .gte('date', since)
    .order('date', { ascending: false })

  const latest = snapshots?.[0] || null

  return NextResponse.json({
    data: {
      snapshots: snapshots || [],
      latest,
      site,
      days,
    },
  })
}
