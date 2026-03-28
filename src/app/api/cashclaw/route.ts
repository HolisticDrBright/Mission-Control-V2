import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// GET /api/cashclaw — Fetch CashClaw metrics from its Supabase tables
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const view = searchParams.get('view') || 'summary'
  const days = parseInt(searchParams.get('days') || '30')

  const supabase = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  try {
    switch (view) {
      case 'summary': {
        // Fetch task runs for the period
        const { data: runs, error } = await supabase
          .from('cashclaw_task_runs')
          .select('*')
          .gte('created_at', since)
          .order('created_at', { ascending: false })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const completed = (runs || []).filter((r) => r.status === 'completed')
        const declined = (runs || []).filter((r) => r.status === 'declined')
        const failed = (runs || []).filter((r) => ['expired', 'cancelled', 'disputed'].includes(r.status))

        const totalEarned = completed.reduce((sum, r) => sum + (r.earned_eth || 0), 0)
        const avgRating = completed.length > 0
          ? completed.reduce((sum, r) => sum + (r.client_rating || 0), 0) / completed.filter((r) => r.client_rating).length || 0
          : 0
        const avgOutcome = completed.length > 0
          ? completed.reduce((sum, r) => sum + (r.outcome_score || 0), 0) / completed.filter((r) => r.outcome_score).length || 0
          : 0
        const totalTokens = (runs || []).reduce((sum, r) => sum + (r.tokens_input || 0) + (r.tokens_output || 0), 0)
        const revisionsNeeded = completed.filter((r) => r.revision_count > 0).length

        // Group by category
        const categoryMap = new Map<string, { count: number; totalEarned: number }>()
        for (const r of completed) {
          const cat = r.category || 'uncategorized'
          const entry = categoryMap.get(cat) || { count: 0, totalEarned: 0 }
          entry.count++
          entry.totalEarned += r.earned_eth || 0
          categoryMap.set(cat, entry)
        }
        const topCategories = Array.from(categoryMap.entries())
          .map(([category, data]) => ({
            category,
            count: data.count,
            avg_earned: data.count > 0 ? data.totalEarned / data.count : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // Daily earnings
        const dailyMap = new Map<string, { earned_eth: number; tasks: number }>()
        for (const r of completed) {
          const date = r.completed_at?.split('T')[0] || r.created_at?.split('T')[0]
          if (!date) continue
          const entry = dailyMap.get(date) || { earned_eth: 0, tasks: 0 }
          entry.earned_eth += r.earned_eth || 0
          entry.tasks++
          dailyMap.set(date, entry)
        }
        const dailyEarnings = Array.from(dailyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Hourly activity
        const hourlyMap = new Map<number, number>()
        for (const r of runs || []) {
          const hour = new Date(r.created_at).getHours()
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
        }
        const hourlyActivity = Array.from({ length: 24 }, (_, h) => ({
          hour: h,
          tasks: hourlyMap.get(h) || 0,
        }))

        // Get unique clients
        const uniqueClients = new Set(completed.map((r) => r.client_address))
        const returnClients = new Set(
          completed
            .map((r) => r.client_address)
            .filter((addr, _i, arr) => arr.filter((a) => a === addr).length > 1)
        )

        const summary = {
          total_earned_eth: totalEarned,
          total_earned_usd: 0, // Need ETH price
          tasks_completed: completed.length,
          tasks_declined: declined.length,
          tasks_failed: failed.length,
          avg_rating: Math.round(avgRating * 100) / 100,
          avg_outcome_score: Math.round(avgOutcome),
          avg_earned_per_task_eth: completed.length > 0 ? totalEarned / completed.length : 0,
          total_tokens_used: totalTokens,
          total_cost_usd: 0,
          net_profit_eth: totalEarned,
          acceptance_rate: (runs || []).length > 0
            ? ((completed.length + failed.length) / ((runs || []).length - declined.length || 1)) * 100
            : 0,
          revision_rate: completed.length > 0
            ? (revisionsNeeded / completed.length) * 100
            : 0,
          return_client_rate: uniqueClients.size > 0
            ? (returnClients.size / uniqueClients.size) * 100
            : 0,
          unique_clients: uniqueClients.size,
          top_categories: topCategories,
          daily_earnings: dailyEarnings,
          hourly_activity: hourlyActivity,
        }

        return NextResponse.json({ data: summary })
      }

      case 'tasks': {
        const status = searchParams.get('status')
        let query = supabase
          .from('cashclaw_task_runs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'clients': {
        const { data, error } = await supabase
          .from('cashclaw_client_profiles')
          .select('*')
          .order('total_eth_paid', { ascending: false })
          .limit(50)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'pricing': {
        const { data, error } = await supabase
          .from('cashclaw_pricing_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ data })
      }

      case 'heartbeat': {
        // Try to fetch live status from CashClaw's local server
        const cashclawUrl = process.env.CASHCLAW_API_URL || 'http://localhost:3777'
        try {
          const res = await fetch(`${cashclawUrl}/api/status`, { signal: AbortSignal.timeout(3000) })
          if (res.ok) {
            const data = await res.json()
            return NextResponse.json({ data, live: true })
          }
        } catch {
          // CashClaw not running locally
        }
        return NextResponse.json({ data: null, live: false, message: 'CashClaw agent not reachable' })
      }

      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
