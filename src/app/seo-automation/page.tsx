'use client'

import { useState, useMemo } from 'react'
import { useSeoData, useOrchestratorState } from '@/lib/hooks/use-orchestrator'
import {
  TrendingUp,
  Search,
  FileText,
  Send,
  Compass,
  BarChart3,
  DollarSign,
  ExternalLink,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  Newspaper,
  Clock,
  Target,
  Zap,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import LiveIndicator from '@/components/ui/LiveIndicator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelinePhase {
  topics_awaiting_research: number
  last_trend_discovery: string | null
  keywords_awaiting_content: number
  last_keyword_research: string | null
  articles_created_today: number
  max_articles_per_day: number
  last_content_creation: string | null
  articles_awaiting_publishing: number
  articles_published_today: number
  last_publishing: string | null
}

interface Trend {
  id: string
  topic: string
  trend_score: number
  sources: string[]
  content_angle: string
  status: string
}

interface Keyword {
  id: string
  keyword: string
  validation_score: number
  search_volume_proxy: string
  competition_level: 'low' | 'medium' | 'high'
  reddit_posts: number
  priority: 'excellent' | 'good' | 'medium' | 'skip'
  content_strategy: string
  status: string
}

interface Article {
  id: string
  title: string
  keyword: string
  word_count: number
  seo_score: number
  cost_usd: number
  created: string
  stage: 'draft' | 'review' | 'published' | 'failed_qa'
  wordpress_url?: string
  indexed?: boolean
  day7_ranking?: number | null
  traffic?: number
}

interface PerformanceMetrics {
  total_published: number
  avg_validation_score: number
  avg_seo_score: number
  avg_cost_per_article: number
  articles_page_one: number
}

interface SEOData {
  system_status: 'healthy' | 'degraded' | 'critical' | 'offline'
  articles_published_total: number
  articles_today: number
  daily_cost: number
  pipeline: PipelinePhase
  trends: Trend[]
  keywords: Keyword[]
  articles: Article[]
  performance: PerformanceMetrics
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-bg)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </h3>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <Icon size={32} style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{message}</p>
      </div>
    </div>
  )
}

const COMPETITION_COLORS: Record<string, string> = {
  low: 'var(--status-running)',
  medium: 'var(--accent-amber)',
  high: 'var(--status-error)',
}

const PRIORITY_COLORS: Record<string, string> = {
  excellent: 'var(--status-running)',
  good: 'var(--accent-blue)',
  medium: 'var(--accent-amber)',
  skip: 'var(--text-muted)',
}

const STAGE_LABELS: Record<string, string> = {
  draft: 'Draft',
  review: 'Ready for Review',
  published: 'Published',
  failed_qa: 'Failed QA',
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SEOAutomationPage() {
  const { data: seoData, loading, error, refetch } = useSeoData(60000) // 60s refresh instead of 30s
  const { data: stateData } = useOrchestratorState(60000)
  const [trendSort, setTrendSort] = useState<'desc' | 'asc'>('desc')
  const [kwFilter, setKwFilter] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Track initial load
  if (!hasLoaded && !loading) setHasLoaded(true)

  // Build a combined data object that matches the old SEOData shape
  const seoState = stateData.seo as Record<string, unknown> | null
  const data: SEOData | null = useMemo(() => (seoData.trends.length > 0 || seoData.keywords.length > 0 || seoData.articles.length > 0 || seoState)
    ? {
        system_status: (seoState?.system_status as SEOData['system_status']) ?? 'offline',
        articles_published_total: (seoState?.articles_published_total as number) ?? 0,
        articles_today: (seoState?.articles_today as number) ?? 0,
        daily_cost: (seoState?.daily_cost as number) ?? 0,
        pipeline: (seoState?.pipeline as PipelinePhase) ?? {
          topics_awaiting_research: 0, last_trend_discovery: null,
          keywords_awaiting_content: 0, last_keyword_research: null,
          articles_created_today: 0, max_articles_per_day: 10, last_content_creation: null,
          articles_awaiting_publishing: 0, articles_published_today: 0, last_publishing: null,
        },
        trends: seoData.trends as unknown as Trend[],
        keywords: seoData.keywords as unknown as Keyword[],
        articles: seoData.articles as unknown as Article[],
        performance: (seoState?.performance as PerformanceMetrics) ?? {
          total_published: 0, avg_validation_score: 0, avg_seo_score: 0,
          avg_cost_per_article: 0, articles_page_one: 0,
        },
      }
    : null, [seoData, seoState])

  // Show skeleton only on first load, not on refreshes
  if (loading && !hasLoaded) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>SEO Automation</h2>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <GlassCard key={i} className="p-5 animate-pulse">
              <div className="h-3 w-20 rounded bg-white/5 mb-3" />
              <div className="h-8 w-16 rounded bg-white/5" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    refetch()
    // Brief visual feedback
    setTimeout(() => setRefreshing(false), 500)
  }

  // Sorted trends
  const sortedTrends = useMemo(() => {
    if (!data?.trends) return []
    return [...data.trends].sort((a, b) =>
      trendSort === 'desc' ? b.trend_score - a.trend_score : a.trend_score - b.trend_score,
    )
  }, [data?.trends, trendSort])

  // Filtered keywords
  const filteredKeywords = useMemo(() => {
    if (!data?.keywords) return []
    if (kwFilter === 'all') return data.keywords
    return data.keywords.filter((k) => k.priority === kwFilter)
  }, [data?.keywords, kwFilter])

  // Article columns
  const articleColumns = useMemo(() => {
    const cols: Record<string, Article[]> = { draft: [], review: [], published: [], failed_qa: [] }
    if (!data?.articles) return cols
    data.articles.forEach((a) => {
      if (cols[a.stage]) cols[a.stage].push(a)
    })
    return cols
  }, [data?.articles])

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------
  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <GlassCard className="p-6">
          <EmptyState icon={BarChart3} message={`Unable to load SEO data: ${error}`} />
        </GlassCard>
      </div>
    )
  }

  const pipeline = data?.pipeline
  const perf = data?.performance

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ================================================================= */}
      {/* 1. Header + System Status                                         */}
      {/* ================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp size={22} style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            SEO Automation
          </h2>
          <LiveIndicator status={data?.system_status ?? 'offline'} label={data?.system_status ?? 'offline'} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
              color: 'var(--accent-cyan)',
              border: '1px solid color-mix(in srgb, var(--accent-cyan) 25%, transparent)',
            }}
          >
            <Newspaper size={12} />
            {data?.articles_published_total ?? 0} published
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: 'color-mix(in srgb, var(--accent-blue) 15%, transparent)',
              color: 'var(--accent-blue)',
              border: '1px solid color-mix(in srgb, var(--accent-blue) 25%, transparent)',
            }}
          >
            <FileText size={12} />
            {data?.articles_today ?? 0} today
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: 'color-mix(in srgb, var(--accent-amber) 15%, transparent)',
              color: 'var(--accent-amber)',
              border: '1px solid color-mix(in srgb, var(--accent-amber) 25%, transparent)',
            }}
          >
            <DollarSign size={12} />
            {formatCurrency(data?.daily_cost ?? 0)} today
          </span>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. Pipeline Overview                                              */}
      {/* ================================================================= */}
      <div>
        <SectionHeading>Pipeline Overview</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Phase 1 — Trend Discovery */}
          {(() => {
            const pending = pipeline?.topics_awaiting_research ?? 0
            const hasWork = pending > 0
            return (
              <GlassCard
                className="p-4"
                hover={false}
                {...(hasWork ? { style: { borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, transparent)' } } : {})}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Compass size={16} style={{ color: hasWork ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Phase 1: Trend Discovery
                  </p>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: hasWork ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                  {pending}
                </p>
                <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>topics awaiting research</p>
                <ScoreBar value={pending} max={Math.max(pending, 20)} color={hasWork ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={10} className="inline mr-1" />
                  Last: {timeAgo(pipeline?.last_trend_discovery ?? null)}
                </p>
              </GlassCard>
            )
          })()}

          {/* Phase 2 — Keyword Research */}
          {(() => {
            const pending = pipeline?.keywords_awaiting_content ?? 0
            const hasWork = pending > 0
            return (
              <GlassCard
                className="p-4"
                hover={false}
                {...(hasWork ? { style: { borderColor: 'color-mix(in srgb, var(--accent-blue) 40%, transparent)' } } : {})}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Search size={16} style={{ color: hasWork ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Phase 2: Keyword Research
                  </p>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: hasWork ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                  {pending}
                </p>
                <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>keywords awaiting content</p>
                <ScoreBar value={pending} max={Math.max(pending, 20)} color={hasWork ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={10} className="inline mr-1" />
                  Last: {timeAgo(pipeline?.last_keyword_research ?? null)}
                </p>
              </GlassCard>
            )
          })()}

          {/* Phase 3 — Content Creation */}
          {(() => {
            const created = pipeline?.articles_created_today ?? 0
            const max = pipeline?.max_articles_per_day ?? 10
            const hasWork = created > 0
            return (
              <GlassCard
                className="p-4"
                hover={false}
                {...(hasWork ? { style: { borderColor: 'color-mix(in srgb, var(--accent-purple) 40%, transparent)' } } : {})}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} style={{ color: hasWork ? 'var(--accent-purple)' : 'var(--text-muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Phase 3: Content Creation
                  </p>
                </div>
                <p className="text-2xl font-bold mb-1" style={{ color: hasWork ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                  {created}/{max}
                </p>
                <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>articles created today</p>
                <ScoreBar value={created} max={max} color={hasWork ? 'var(--accent-purple)' : 'var(--text-muted)'} />
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={10} className="inline mr-1" />
                  Last: {timeAgo(pipeline?.last_content_creation ?? null)}
                </p>
              </GlassCard>
            )
          })()}

          {/* Phase 4 — Publishing */}
          {(() => {
            const awaiting = pipeline?.articles_awaiting_publishing ?? 0
            const published = pipeline?.articles_published_today ?? 0
            const hasWork = awaiting > 0
            return (
              <GlassCard
                className="p-4"
                hover={false}
                {...(hasWork ? { style: { borderColor: 'color-mix(in srgb, var(--accent-rose) 40%, transparent)' } } : {})}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Send size={16} style={{ color: hasWork ? 'var(--accent-rose)' : 'var(--text-muted)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Phase 4: Publishing
                  </p>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-2xl font-bold" style={{ color: hasWork ? 'var(--accent-rose)' : 'var(--text-primary)' }}>
                    {awaiting}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    awaiting &middot; {published} published
                  </p>
                </div>
                <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>articles in queue</p>
                <ScoreBar value={awaiting} max={Math.max(awaiting + published, 10)} color={hasWork ? 'var(--accent-rose)' : 'var(--text-muted)'} />
                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={10} className="inline mr-1" />
                  Last: {timeAgo(pipeline?.last_publishing ?? null)}
                </p>
              </GlassCard>
            )
          })()}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. Trend Discovery Feed                                           */}
      {/* ================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Trend Discovery Feed</SectionHeading>
          <button
            onClick={() => setTrendSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--glass-bg)' }}
          >
            <ArrowUpDown size={10} />
            Score {trendSort === 'desc' ? 'High-Low' : 'Low-High'}
          </button>
        </div>
        <GlassCard className="p-4" hover={false}>
          {sortedTrends.length === 0 ? (
            <EmptyState icon={Compass} message="No trends discovered yet. The pipeline will populate this feed automatically." />
          ) : (
            <div className="space-y-3">
              {sortedTrends.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg"
                  style={{ background: 'color-mix(in srgb, var(--glass-bg) 60%, transparent)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {t.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {t.sources.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--glass-bg)', color: 'var(--text-muted)' }}
                        >
                          {s}
                        </span>
                      ))}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)',
                          color: 'var(--accent-purple)',
                        }}
                      >
                        {t.content_angle}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        <span>Score</span>
                        <span>{t.trend_score}</span>
                      </div>
                      <ScoreBar
                        value={t.trend_score}
                        color={
                          t.trend_score >= 70
                            ? 'var(--status-running)'
                            : t.trend_score >= 40
                              ? 'var(--accent-amber)'
                              : 'var(--text-muted)'
                        }
                      />
                    </div>
                    <StatusPill status={t.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ================================================================= */}
      {/* 4. Keyword Pipeline                                               */}
      {/* ================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Keyword Pipeline</SectionHeading>
          <div className="flex items-center gap-1">
            <Filter size={10} style={{ color: 'var(--text-muted)' }} />
            {['all', 'excellent', 'good', 'medium', 'skip'].map((f) => (
              <button
                key={f}
                onClick={() => setKwFilter(f)}
                className="text-[10px] px-2 py-1 rounded-md transition-colors capitalize"
                style={{
                  color: kwFilter === f ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  background: kwFilter === f ? 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)' : 'transparent',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <GlassCard className="p-0 overflow-x-auto" hover={false}>
          {filteredKeywords.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Search} message="No keywords match the current filter." />
            </div>
          ) : (
            <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th className="text-left px-4 py-3 font-medium">Keyword</th>
                  <th className="text-left px-4 py-3 font-medium">Validation</th>
                  <th className="text-left px-4 py-3 font-medium">Volume</th>
                  <th className="text-left px-4 py-3 font-medium">Competition</th>
                  <th className="text-left px-4 py-3 font-medium">Reddit</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Strategy</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((kw) => (
                  <tr
                    key={kw.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid color-mix(in srgb, var(--glass-border) 50%, transparent)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--glass-bg) 60%, transparent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{kw.keyword}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <ScoreBar
                            value={kw.validation_score}
                            color={
                              kw.validation_score >= 70
                                ? 'var(--status-running)'
                                : kw.validation_score >= 40
                                  ? 'var(--accent-amber)'
                                  : 'var(--status-error)'
                            }
                          />
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{kw.validation_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{kw.search_volume_proxy}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: `color-mix(in srgb, ${COMPETITION_COLORS[kw.competition_level]} 15%, transparent)`,
                          color: COMPETITION_COLORS[kw.competition_level],
                        }}
                      >
                        {kw.competition_level}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{kw.reddit_posts}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: `color-mix(in srgb, ${PRIORITY_COLORS[kw.priority]} 15%, transparent)`,
                          color: PRIORITY_COLORS[kw.priority],
                        }}
                      >
                        {kw.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[150px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {kw.content_strategy}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={kw.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </div>

      {/* ================================================================= */}
      {/* 5. Article Pipeline (Kanban)                                      */}
      {/* ================================================================= */}
      <div>
        <SectionHeading>Article Pipeline</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(['draft', 'review', 'published', 'failed_qa'] as const).map((stage) => {
            const articles = articleColumns[stage]
            const stageColors: Record<string, string> = {
              draft: 'var(--text-muted)',
              review: 'var(--accent-amber)',
              published: 'var(--status-running)',
              failed_qa: 'var(--status-error)',
            }
            return (
              <div key={stage}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: stageColors[stage] }}>
                    {STAGE_LABELS[stage]}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${stageColors[stage]} 15%, transparent)`,
                      color: stageColors[stage],
                    }}
                  >
                    {articles.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {articles.length === 0 ? (
                    <GlassCard className="p-4" hover={false}>
                      <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
                        No articles
                      </p>
                    </GlassCard>
                  ) : (
                    articles.map((a) => (
                      <GlassCard key={a.id} className="p-3" hover={false}>
                        <p className="text-xs font-medium mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                          {a.title}
                        </p>
                        <p className="text-[10px] mb-2 truncate" style={{ color: 'var(--text-muted)' }}>
                          {a.keyword}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] mb-2" style={{ color: 'var(--text-secondary)' }}>
                          <span>{a.word_count.toLocaleString()} words</span>
                          <span>&middot;</span>
                          <span>{formatCurrency(a.cost_usd)}</span>
                        </div>
                        {/* SEO score meter */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
                            <span>SEO</span>
                            <span>{a.seo_score}/100</span>
                          </div>
                          <ScoreBar
                            value={a.seo_score}
                            color={
                              a.seo_score >= 80
                                ? 'var(--status-running)'
                                : a.seo_score >= 60
                                  ? 'var(--accent-amber)'
                                  : 'var(--status-error)'
                            }
                          />
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(a.created).toLocaleDateString()}
                        </p>
                        {/* Published-specific info */}
                        {stage === 'published' && (
                          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
                            {a.wordpress_url && (
                              <a
                                href={a.wordpress_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] mb-1 hover:underline"
                                style={{ color: 'var(--accent-cyan)' }}
                              >
                                <ExternalLink size={10} /> View Post
                              </a>
                            )}
                            <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color: 'var(--text-muted)' }}>
                              <span
                                className="px-1 py-0.5 rounded"
                                style={{
                                  background: a.indexed
                                    ? 'color-mix(in srgb, var(--status-running) 15%, transparent)'
                                    : 'color-mix(in srgb, var(--text-muted) 15%, transparent)',
                                  color: a.indexed ? 'var(--status-running)' : 'var(--text-muted)',
                                }}
                              >
                                {a.indexed ? 'Indexed' : 'Not indexed'}
                              </span>
                              {a.day7_ranking != null && (
                                <span>
                                  Rank: #{a.day7_ranking}
                                </span>
                              )}
                              {a.traffic != null && (
                                <span>
                                  {a.traffic} visits
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 6. Performance Metrics                                            */}
      {/* ================================================================= */}
      <div>
        <SectionHeading>Performance Metrics</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: 'Total Published',
              value: perf?.total_published ?? 0,
              format: (v: number) => v.toString(),
              icon: Newspaper,
              color: 'var(--accent-cyan)',
            },
            {
              label: 'Avg Validation Score',
              value: perf?.avg_validation_score ?? 0,
              format: (v: number) => v.toFixed(1),
              icon: Target,
              color: 'var(--accent-blue)',
            },
            {
              label: 'Avg SEO Score',
              value: perf?.avg_seo_score ?? 0,
              format: (v: number) => v.toFixed(1),
              icon: TrendingUp,
              color: 'var(--accent-purple)',
            },
            {
              label: 'Avg Cost / Article',
              value: perf?.avg_cost_per_article ?? 0,
              format: (v: number) => formatCurrency(v),
              icon: DollarSign,
              color: 'var(--accent-amber)',
            },
            {
              label: 'Page 1 Articles',
              value: perf?.articles_page_one ?? 0,
              format: (v: number) => v.toString(),
              icon: Zap,
              color: 'var(--status-running)',
            },
          ].map((m) => (
            <GlassCard key={m.label} className="p-4" hover={false}>
              <div className="flex items-center gap-2 mb-2">
                <m.icon size={14} style={{ color: m.color }} />
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {m.label}
                </p>
              </div>
              <p className="text-2xl font-bold" style={{ color: m.color }}>
                {m.format(m.value)}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
