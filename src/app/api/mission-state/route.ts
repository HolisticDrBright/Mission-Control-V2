import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/mission-state — Read unified orchestrator state
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { searchParams } = request.nextUrl
  const section = searchParams.get('section') // 'seo' | 'outreach' | 'cron' | 'system' | 'budget' | 'alerts' | null (all)

  try {
    switch (section) {
      case 'seo': {
        const [
          { data: trends },
          { data: keywords },
          { data: articles },
          { data: state },
        ] = await Promise.all([
          supabase.from('mc_seo_trends').select('*').order('discovered_at', { ascending: false }).limit(50),
          supabase.from('mc_seo_keywords').select('*').order('validation_score', { ascending: false }).limit(50),
          supabase.from('mc_seo_articles').select('*').order('created_at', { ascending: false }).limit(50),
          supabase.from('mc_orchestrator_state').select('*').eq('system', 'seo').single(),
        ])
        return NextResponse.json({ data: { trends, keywords, articles, state: state?.state_data } })
      }

      case 'outreach': {
        const [
          { data: signals },
          { data: leads },
          { data: campaigns },
          { data: replies },
          { data: domains },
          { data: state },
        ] = await Promise.all([
          supabase.from('mc_outreach_signals').select('*').order('detected_at', { ascending: false }).limit(50),
          supabase.from('mc_outreach_leads').select('*').order('lead_score', { ascending: false }).limit(100),
          supabase.from('mc_outreach_campaigns').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('mc_outreach_replies').select('*').eq('actioned', false).order('received_at', { ascending: false }).limit(50),
          supabase.from('mc_outreach_domains').select('*'),
          supabase.from('mc_orchestrator_state').select('*').eq('system', 'outreach').single(),
        ])
        return NextResponse.json({ data: { signals, leads, campaigns, replies, domains, state: state?.state_data } })
      }

      case 'budget': {
        const today = new Date().toISOString().split('T')[0]
        const { data: costs } = await supabase
          .from('mc_cost_log')
          .select('*')
          .gte('date', today)

        const seo = (costs || []).filter(c => c.system === 'seo').reduce((s, c) => s + (c.amount_usd || 0), 0)
        const outreach = (costs || []).filter(c => c.system === 'outreach').reduce((s, c) => s + (c.amount_usd || 0), 0)
        const cron = (costs || []).filter(c => c.system === 'cron').reduce((s, c) => s + (c.amount_usd || 0), 0)
        const total = seo + outreach + cron
        const budget = 15.00

        return NextResponse.json({
          data: {
            seo: Math.round(seo * 100) / 100,
            outreach: Math.round(outreach * 100) / 100,
            cron: Math.round(cron * 100) / 100,
            total: Math.round(total * 100) / 100,
            remaining: Math.round((budget - total) * 100) / 100,
            budget,
            percent_used: Math.round((total / budget) * 100),
          },
        })
      }

      case 'alerts': {
        const { data: alerts } = await supabase
          .from('mc_alerts')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50)

        return NextResponse.json({ data: alerts })
      }

      default: {
        // Return full unified state
        const [
          { data: seoState },
          { data: outreachState },
          { data: alerts },
        ] = await Promise.all([
          supabase.from('mc_orchestrator_state').select('*').eq('system', 'seo').single(),
          supabase.from('mc_orchestrator_state').select('*').eq('system', 'outreach').single(),
          supabase.from('mc_alerts').select('*').eq('acknowledged', false).order('timestamp', { ascending: false }).limit(10),
        ])

        // Quick stats
        const today = new Date().toISOString().split('T')[0]
        const [
          { count: articlesToday },
          { count: signalsToday },
          { count: hotLeads },
          { count: pendingReplies },
        ] = await Promise.all([
          supabase.from('mc_seo_articles').select('*', { count: 'exact', head: true }).gte('created_at', today),
          supabase.from('mc_outreach_signals').select('*', { count: 'exact', head: true }).gte('detected_at', today),
          supabase.from('mc_outreach_leads').select('*', { count: 'exact', head: true }).eq('pipeline_stage', 'replied').eq('reply_sentiment', 'interested'),
          supabase.from('mc_outreach_replies').select('*', { count: 'exact', head: true }).eq('actioned', false),
        ])

        return NextResponse.json({
          data: {
            seo: seoState?.state_data || null,
            outreach: outreachState?.state_data || null,
            alerts: alerts || [],
            quick_stats: {
              articles_today: articlesToday || 0,
              signals_today: signalsToday || 0,
              hot_leads: hotLeads || 0,
              pending_replies: pendingReplies || 0,
            },
          },
        })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
