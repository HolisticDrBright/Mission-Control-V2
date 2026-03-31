'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Generic safe-fetch helper for Supabase queries
// ---------------------------------------------------------------------------

type QueryResult<T> = {
  data: T
  loading: boolean
  error: string | null
  refetch: () => void
}

function useSupabaseQuery<T>(
  queryFn: (supabase: ReturnType<typeof createClient>) => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  defaultValue: T,
  refreshInterval?: number,
): QueryResult<T> {
  const [data, setData] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    try {
      const supabase = createClient()
      queryFn(supabase).then(
        (result) => {
          if (result.error) {
            console.error('[use-orchestrator] query error:', result.error.message)
            setError(result.error.message)
            setData(defaultValue) // Reset to safe default on error
          } else {
            setData(result.data ?? defaultValue)
            setError(null)
          }
          setLoading(false)
        },
        (err) => {
          console.error('[use-orchestrator] fetch failed:', err)
          setData(defaultValue) // Reset to safe default on network failure
          setLoading(false)
        },
      )
    } catch (err) {
      console.error('[use-orchestrator] client error:', err)
      setData(defaultValue) // Reset to safe default if client creation fails
      setLoading(false)
    }
  }, [queryFn, defaultValue])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    if (!refreshInterval) return
    const interval = setInterval(fetch, refreshInterval)
    return () => clearInterval(interval)
  }, [fetch, refreshInterval])

  return { data, loading, error, refetch: fetch }
}

// ---------------------------------------------------------------------------
// Orchestrator State
// ---------------------------------------------------------------------------

export interface OrchestratorStateData {
  seo: Record<string, unknown> | null
  outreach: Record<string, unknown> | null
}

export function useOrchestratorState(refreshMs = 30000) {
  return useSupabaseQuery<OrchestratorStateData>(
    useCallback((supabase) => {
      return supabase
        .from('mc_orchestrator_state')
        .select('system, state_data')
        .then(({ data, error }) => {
          if (error) return { data: null, error }
          const seoRow = (data || []).find((r: { system: string }) => r.system === 'seo')
          const outreachRow = (data || []).find((r: { system: string }) => r.system === 'outreach')
          return {
            data: {
              seo: seoRow?.state_data ?? null,
              outreach: outreachRow?.state_data ?? null,
            },
            error: null,
          }
        })
    }, []),
    { seo: null, outreach: null },
    refreshMs,
  )
}

// ---------------------------------------------------------------------------
// SEO Data
// ---------------------------------------------------------------------------

export interface SeoData {
  trends: Array<Record<string, unknown>>
  keywords: Array<Record<string, unknown>>
  articles: Array<Record<string, unknown>>
}

export function useSeoData(refreshMs = 30000) {
  return useSupabaseQuery<SeoData>(
    useCallback((supabase) => {
      return Promise.all([
        supabase.from('mc_seo_trends').select('*').order('discovered_at', { ascending: false }).limit(50),
        supabase.from('mc_seo_keywords').select('*').order('validation_score', { ascending: false }).limit(50),
        supabase.from('mc_seo_articles').select('*').order('created_at', { ascending: false }).limit(50),
      ]).then(([trendsRes, keywordsRes, articlesRes]) => {
        return {
          data: {
            trends: trendsRes.data || [],
            keywords: keywordsRes.data || [],
            articles: articlesRes.data || [],
          },
          error: trendsRes.error || keywordsRes.error || articlesRes.error,
        }
      })
    }, []),
    { trends: [], keywords: [], articles: [] },
    refreshMs,
  )
}

// ---------------------------------------------------------------------------
// Outreach Data
// ---------------------------------------------------------------------------

export interface OutreachData {
  signals: Array<Record<string, unknown>>
  leads: Array<Record<string, unknown>>
  campaigns: Array<Record<string, unknown>>
  replies: Array<Record<string, unknown>>
  domains: Array<Record<string, unknown>>
}

export function useOutreachData(refreshMs = 30000) {
  return useSupabaseQuery<OutreachData>(
    useCallback((supabase) => {
      return Promise.all([
        supabase.from('mc_outreach_signals').select('*').order('detected_at', { ascending: false }).limit(50),
        supabase.from('mc_outreach_leads').select('*').order('lead_score', { ascending: false }).limit(100),
        supabase.from('mc_outreach_campaigns').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('mc_outreach_replies').select('*').eq('actioned', false).order('received_at', { ascending: false }).limit(50),
        supabase.from('mc_outreach_domains').select('*'),
      ]).then(([signalsRes, leadsRes, campaignsRes, repliesRes, domainsRes]) => {
        return {
          data: {
            signals: signalsRes.data || [],
            leads: leadsRes.data || [],
            campaigns: campaignsRes.data || [],
            replies: repliesRes.data || [],
            domains: domainsRes.data || [],
          },
          error: signalsRes.error || leadsRes.error || campaignsRes.error || repliesRes.error || domainsRes.error,
        }
      })
    }, []),
    { signals: [], leads: [], campaigns: [], replies: [], domains: [] },
    refreshMs,
  )
}

// ---------------------------------------------------------------------------
// Cost Log
// ---------------------------------------------------------------------------

export interface CostData {
  seo: number
  outreach: number
  cron: number
  total: number
  remaining: number
  budget: number
  percent_used: number
  entries: Array<Record<string, unknown>>
}

export function useCostLog(refreshMs = 30000) {
  return useSupabaseQuery<CostData>(
    useCallback((supabase) => {
      const today = new Date().toISOString().split('T')[0]
      return supabase
        .from('mc_cost_log')
        .select('*')
        .gte('date', today)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          const entries = data || []
          const seo = entries.filter((c: { system: string }) => c.system === 'seo').reduce((s: number, c: { amount_usd: number }) => s + (c.amount_usd || 0), 0)
          const outreach = entries.filter((c: { system: string }) => c.system === 'outreach').reduce((s: number, c: { amount_usd: number }) => s + (c.amount_usd || 0), 0)
          const cron = entries.filter((c: { system: string }) => c.system === 'cron').reduce((s: number, c: { amount_usd: number }) => s + (c.amount_usd || 0), 0)
          const total = seo + outreach + cron
          const budget = 15.00
          return {
            data: {
              seo: Math.round(seo * 100) / 100,
              outreach: Math.round(outreach * 100) / 100,
              cron: Math.round(cron * 100) / 100,
              total: Math.round(total * 100) / 100,
              remaining: Math.round((budget - total) * 100) / 100,
              budget,
              percent_used: Math.round((total / budget) * 100),
              entries,
            },
            error,
          }
        })
    }, []),
    { seo: 0, outreach: 0, cron: 0, total: 0, remaining: 15, budget: 15, percent_used: 0, entries: [] },
    refreshMs,
  )
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export interface AlertData {
  alerts: Array<{
    id: string
    system: string
    severity: string
    issue: string
    action_needed: string | null
    acknowledged: boolean
    timestamp: string
  }>
  unacknowledged: number
}

export function useAlerts(refreshMs = 15000) {
  return useSupabaseQuery<AlertData>(
    useCallback((supabase) => {
      return supabase
        .from('mc_alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          const alerts = data || []
          return {
            data: {
              alerts,
              unacknowledged: alerts.filter((a: { acknowledged: boolean }) => !a.acknowledged).length,
            },
            error,
          }
        })
    }, []),
    { alerts: [], unacknowledged: 0 },
    refreshMs,
  )
}

// ---------------------------------------------------------------------------
// Quick Stats (for dashboard)
// ---------------------------------------------------------------------------

export interface QuickStats {
  articles_today: number
  signals_today: number
  hot_leads: number
  pending_replies: number
  total_articles: number
  total_leads: number
  meetings_booked: number
}

export function useQuickStats(refreshMs = 30000) {
  return useSupabaseQuery<QuickStats>(
    useCallback((supabase) => {
      const today = new Date().toISOString().split('T')[0]
      return Promise.all([
        supabase.from('mc_seo_articles').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('mc_outreach_signals').select('*', { count: 'exact', head: true }).gte('detected_at', today),
        supabase.from('mc_outreach_leads').select('*', { count: 'exact', head: true }).eq('reply_sentiment', 'interested'),
        supabase.from('mc_outreach_replies').select('*', { count: 'exact', head: true }).eq('actioned', false),
        supabase.from('mc_seo_articles').select('*', { count: 'exact', head: true }),
        supabase.from('mc_outreach_leads').select('*', { count: 'exact', head: true }),
        supabase.from('mc_outreach_leads').select('*', { count: 'exact', head: true }).eq('meeting_booked', true),
      ]).then(([articlesToday, signalsToday, hotLeads, pendingReplies, totalArticles, totalLeads, meetings]) => {
        return {
          data: {
            articles_today: articlesToday.count || 0,
            signals_today: signalsToday.count || 0,
            hot_leads: hotLeads.count || 0,
            pending_replies: pendingReplies.count || 0,
            total_articles: totalArticles.count || 0,
            total_leads: totalLeads.count || 0,
            meetings_booked: meetings.count || 0,
          },
          error: null,
        }
      })
    }, []),
    { articles_today: 0, signals_today: 0, hot_leads: 0, pending_replies: 0, total_articles: 0, total_leads: 0, meetings_booked: 0 },
    refreshMs,
  )
}
