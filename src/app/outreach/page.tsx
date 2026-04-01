'use client'

import { useState, useCallback } from 'react'
import { useOutreachData, useOrchestratorState } from '@/lib/hooks/use-orchestrator'
import {
  Target,
  Radio,
  UserPlus,
  Mail,
  ShieldCheck,
  Send,
  MessageSquareReply,
  CalendarCheck,
  ChevronRight,
  Flame,
  ThermometerSun,
  Snowflake,
  Filter,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Inbox,
  BarChart3,
  Globe,
  DollarSign,
  Zap,
  Eye,
  MousePointerClick,
  ArrowRight,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import LiveIndicator from '@/components/ui/LiveIndicator'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Signal {
  id: string
  company_name: string
  signal_type: string
  signal_strength: 'HOT' | 'WARM' | 'COLD'
  urgency_score: number
  source: string
  recommended_approach: string
  status: string
  detected_at: string
}

interface Lead {
  id: string
  company_name: string
  lead_score: number
  industry: string
  contacts_count: number
  personalization_brief: string
  pipeline_stage: string
  reply_sentiment?: string
}

interface Reply {
  id: string
  lead_name: string
  company: string
  category: 'interested' | 'maybe_later' | 'not_interested' | 'referral' | 'angry'
  snippet: string
  received_at: string
  actioned: boolean
}

interface Campaign {
  id: string
  name: string
  status: string
  leads_count: number
  emails_sent: number
  open_rate: number
  reply_rate: number
  positive_reply_rate: number
  bounce_rate: number
  meetings_booked: number
}

interface Domain {
  domain: string
  spf: boolean
  dkim: boolean
  dmarc: boolean
  mx: boolean
  blacklist: boolean
  warmup_day: number
  daily_send_limit: number
}

interface FunnelStage {
  label: string
  count: number
  icon: React.ElementType
}

interface DailyStats {
  signals_detected: number
  leads_enriched: number
  emails_validated: number
  emails_sent: number
  reply_queue_size: number
  daily_cost: number
}

interface OutreachData {
  health: 'healthy' | 'degraded' | 'critical' | 'offline'
  metrics: {
    signals_today: number
    leads_enriched: number
    emails_sent: number
    hot_leads: number
  }
  funnel: {
    signals_detected: number
    leads_enriched: number
    emails_found: number
    emails_validated: number
    campaign_sent: number
    replies: number
    meetings_booked: number
  }
  signals: Signal[]
  leads: Lead[]
  replies: Reply[]
  campaigns: Campaign[]
  domains: Domain[]
  daily_stats: DailyStats
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  'Signal',
  'Enriched',
  'Email Found',
  'Validated',
  'Campaign',
  'Replied',
  'Meeting',
  'Closed',
] as const

const strengthColor = (s: string) =>
  s === 'HOT'
    ? 'var(--accent-rose)'
    : s === 'WARM'
      ? 'var(--accent-amber)'
      : 'var(--text-muted)'

const categoryColor: Record<string, string> = {
  interested: 'var(--accent-emerald)',
  maybe_later: 'var(--accent-blue)',
  not_interested: 'var(--text-muted)',
  referral: 'var(--accent-purple)',
  angry: 'var(--accent-rose)',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

// ─── Section Components ──────────────────────────────────────────────────────

function MetricPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  accent: string
}) {
  return (
    <GlassCard className="p-4 flex items-center gap-3 min-w-[180px]">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }}
      >
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </GlassCard>
  )
}

function PipelineFunnel({ funnel }: { funnel: OutreachData['funnel'] }) {
  const stages: FunnelStage[] = [
    { label: 'Signals', count: funnel.signals_detected, icon: Radio },
    { label: 'Enriched', count: funnel.leads_enriched, icon: UserPlus },
    { label: 'Emails Found', count: funnel.emails_found, icon: Mail },
    { label: 'Validated', count: funnel.emails_validated, icon: ShieldCheck },
    { label: 'Sent', count: funnel.campaign_sent, icon: Send },
    { label: 'Replies', count: funnel.replies, icon: MessageSquareReply },
    { label: 'Meetings', count: funnel.meetings_booked, icon: CalendarCheck },
  ]

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Pipeline Funnel
      </h2>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const prev = i > 0 ? stages[i - 1].count : 0
          const conversion = prev > 0 ? ((stage.count / prev) * 100).toFixed(1) : null
          const Icon = stage.icon
          const maxCount = stages[0].count || 1
          const widthPercent = Math.max(((stage.count / maxCount) * 100), 30)

          return (
            <div key={stage.label} className="flex items-center gap-1 shrink-0">
              <div
                className="rounded-xl p-3 text-center transition-all duration-300"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  minWidth: `${widthPercent * 1.2}px`,
                  maxWidth: '160px',
                }}
              >
                <Icon
                  size={18}
                  className="mx-auto mb-1"
                  style={{ color: 'var(--accent-cyan)' }}
                />
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stage.count.toLocaleString()}
                </p>
                <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {stage.label}
                </p>
                {conversion && (
                  <p
                    className="text-[10px] mt-1 font-medium"
                    style={{ color: 'var(--accent-emerald)' }}
                  >
                    {conversion}%
                  </p>
                )}
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center px-1 shrink-0">
                  <div
                    className="w-6 h-[2px] animate-pulse"
                    style={{ background: 'var(--accent-cyan)' }}
                  />
                  <ChevronRight size={14} style={{ color: 'var(--accent-cyan)' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

function SignalFeed({ signals }: { signals: Signal[] }) {
  const [filter, setFilter] = useState<'ALL' | 'HOT' | 'WARM' | 'COLD'>('ALL')
  const filtered = filter === 'ALL' ? signals : signals.filter((s) => s.signal_strength === filter)

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Radio size={18} className="inline mr-2" style={{ color: 'var(--accent-cyan)' }} />
          Signal Feed
        </h2>
        <div className="flex items-center gap-1">
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {(['ALL', 'HOT', 'WARM', 'COLD'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background:
                  filter === s
                    ? s === 'HOT'
                      ? 'color-mix(in srgb, var(--accent-rose) 25%, transparent)'
                      : s === 'WARM'
                        ? 'color-mix(in srgb, var(--accent-amber) 25%, transparent)'
                        : s === 'COLD'
                          ? 'color-mix(in srgb, var(--text-muted) 25%, transparent)'
                          : 'color-mix(in srgb, var(--accent-cyan) 25%, transparent)'
                    : 'transparent',
                color:
                  filter === s
                    ? s === 'HOT'
                      ? 'var(--accent-rose)'
                      : s === 'WARM'
                        ? 'var(--accent-amber)'
                        : s === 'COLD'
                          ? 'var(--text-muted)'
                          : 'var(--accent-cyan)'
                    : 'var(--text-secondary)',
                border: `1px solid ${filter === s ? (s === 'HOT' ? 'var(--accent-rose)' : s === 'WARM' ? 'var(--accent-amber)' : s === 'COLD' ? 'var(--text-muted)' : 'var(--accent-cyan)') : 'transparent'}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Radio size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No signals matching filter</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map((signal) => (
            <div
              key={signal.id}
              className="rounded-xl p-3 flex items-start gap-3 transition-all"
              style={{
                background: 'color-mix(in srgb, var(--glass-bg) 60%, transparent)',
                border: '1px solid var(--glass-border)',
                boxShadow:
                  signal.signal_strength === 'HOT'
                    ? '0 0 12px color-mix(in srgb, var(--accent-rose) 30%, transparent)'
                    : 'none',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: `color-mix(in srgb, ${strengthColor(signal.signal_strength)} 15%, transparent)`,
                  color: strengthColor(signal.signal_strength),
                }}
              >
                {signal.signal_strength === 'HOT' ? (
                  <Flame size={16} />
                ) : signal.signal_strength === 'WARM' ? (
                  <ThermometerSun size={16} />
                ) : (
                  <Snowflake size={16} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {signal.company_name}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)',
                      color: 'var(--accent-purple)',
                      border:
                        '1px solid color-mix(in srgb, var(--accent-purple) 25%, transparent)',
                    }}
                  >
                    {signal.signal_type}
                  </span>
                  <StatusPill status={signal.status} size="sm" />
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {signal.recommended_approach}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Urgency
                    </span>
                    <div
                      className="w-16 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'color-mix(in srgb, var(--text-muted) 20%, transparent)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${signal.urgency_score * 10}%`,
                          background:
                            signal.urgency_score >= 8
                              ? 'var(--accent-rose)'
                              : signal.urgency_score >= 5
                                ? 'var(--accent-amber)'
                                : 'var(--accent-cyan)',
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-medium"
                      style={{
                        color:
                          signal.urgency_score >= 8
                            ? 'var(--accent-rose)'
                            : signal.urgency_score >= 5
                              ? 'var(--accent-amber)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {signal.urgency_score}/10
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    via {signal.source}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(signal.detected_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function LeadPipeline({ leads }: { leads: Lead[] }) {
  const grouped: Record<string, Lead[]> = {}
  for (const stage of PIPELINE_STAGES) grouped[stage] = []
  for (const lead of leads) {
    const stage = lead.pipeline_stage || 'Signal'
    if (grouped[stage]) grouped[stage].push(lead)
    else grouped['Signal'].push(lead)
  }

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        <UserPlus size={18} className="inline mr-2" style={{ color: 'var(--accent-cyan)' }} />
        Lead Pipeline
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage) => (
          <div key={stage} className="shrink-0 w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {stage}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
                  color: 'var(--accent-cyan)',
                }}
              >
                {grouped[stage].length}
              </span>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {grouped[stage].length === 0 ? (
                <div
                  className="rounded-lg p-3 text-center"
                  style={{
                    background: 'color-mix(in srgb, var(--glass-bg) 40%, transparent)',
                    border: '1px dashed var(--glass-border)',
                  }}
                >
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Empty
                  </p>
                </div>
              ) : (
                grouped[stage].map((lead) => {
                  const isHot = lead.reply_sentiment === 'interested'
                  return (
                    <div
                      key={lead.id}
                      className="rounded-lg p-3 transition-all"
                      style={{
                        background: 'color-mix(in srgb, var(--glass-bg) 70%, transparent)',
                        border: `1px solid ${isHot ? 'var(--accent-emerald)' : 'var(--glass-border)'}`,
                        boxShadow: isHot
                          ? '0 0 16px color-mix(in srgb, var(--accent-emerald) 30%, transparent)'
                          : 'none',
                      }}
                    >
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {lead.company_name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {lead.industry}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{
                            background:
                              'color-mix(in srgb, var(--text-muted) 20%, transparent)',
                          }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${lead.lead_score}%`,
                              background:
                                lead.lead_score >= 80
                                  ? 'var(--accent-emerald)'
                                  : lead.lead_score >= 50
                                    ? 'var(--accent-amber)'
                                    : 'var(--accent-cyan)',
                            }}
                          />
                        </div>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {lead.lead_score}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {lead.contacts_count} contacts
                        </span>
                        {isHot && (
                          <Flame size={12} style={{ color: 'var(--accent-emerald)' }} />
                        )}
                      </div>
                      {lead.personalization_brief && (
                        <p
                          className="text-[10px] mt-1.5 line-clamp-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {lead.personalization_brief}
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function ReplyInbox({
  replies,
  onMarkActioned,
}: {
  replies: Reply[]
  onMarkActioned: (id: string) => void
}) {
  const unactioned = replies.filter((r) => !r.actioned)

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          <Inbox size={18} className="inline mr-2" style={{ color: 'var(--accent-amber)' }} />
          Reply Inbox
          {unactioned.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse"
              style={{
                background: 'color-mix(in srgb, var(--accent-rose) 20%, transparent)',
                color: 'var(--accent-rose)',
                border: '1px solid var(--accent-rose)',
              }}
            >
              {unactioned.length}
            </span>
          )}
        </h2>
      </div>

      {unactioned.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Inbox size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">All caught up! No pending replies.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {unactioned.map((reply) => {
            const color = categoryColor[reply.category] || 'var(--text-muted)'
            const isHot = reply.category === 'interested'

            return (
              <div
                key={reply.id}
                className="rounded-xl p-3 flex items-start gap-3 transition-all"
                style={{
                  background: isHot
                    ? 'color-mix(in srgb, var(--accent-emerald) 8%, var(--glass-bg))'
                    : 'color-mix(in srgb, var(--glass-bg) 60%, transparent)',
                  border: `1px solid ${isHot ? 'var(--accent-emerald)' : 'var(--glass-border)'}`,
                  boxShadow: isHot
                    ? '0 0 20px color-mix(in srgb, var(--accent-emerald) 25%, transparent), 0 0 40px color-mix(in srgb, var(--accent-emerald) 10%, transparent)'
                    : reply.category === 'angry'
                      ? '0 0 12px color-mix(in srgb, var(--accent-rose) 20%, transparent)'
                      : 'none',
                }}
              >
                <div
                  className="w-2 h-full min-h-[40px] rounded-full shrink-0"
                  style={{ background: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-semibold text-sm"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {reply.lead_name}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      @ {reply.company}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                        color,
                        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                      }}
                    >
                      {reply.category.replace('_', ' ')}
                    </span>
                    {isHot && (
                      <span
                        className="animate-pulse text-[10px] font-bold"
                        style={{ color: 'var(--accent-emerald)' }}
                      >
                        HOT LEAD
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    &ldquo;{reply.snippet}&rdquo;
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(reply.received_at)}
                    </span>
                    <button
                      onClick={() => onMarkActioned(reply.id)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
                        color: 'var(--accent-cyan)',
                        border:
                          '1px solid color-mix(in srgb, var(--accent-cyan) 30%, transparent)',
                      }}
                    >
                      Mark Actioned
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GlassCard>
  )
}

function CampaignPerformance({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        <BarChart3 size={18} className="inline mr-2" style={{ color: 'var(--accent-cyan)' }} />
        Campaign Performance
      </h2>

      {campaigns.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Send size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No campaigns yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="rounded-xl p-4"
              style={{
                background: 'color-mix(in srgb, var(--glass-bg) 60%, transparent)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="font-semibold text-sm truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {camp.name}
                </span>
                <StatusPill status={camp.status} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {camp.leads_count}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Leads
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {camp.emails_sent}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Sent
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--accent-emerald)' }}>
                    {camp.meetings_booked}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Meetings
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Open Rate', value: camp.open_rate, color: 'var(--accent-cyan)' },
                  { label: 'Reply Rate', value: camp.reply_rate, color: 'var(--accent-blue)' },
                  {
                    label: 'Positive Reply',
                    value: camp.positive_reply_rate,
                    color: 'var(--accent-emerald)',
                  },
                  { label: 'Bounce Rate', value: camp.bounce_rate, color: 'var(--accent-rose)' },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center gap-2">
                    <span
                      className="text-[10px] w-20 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {metric.label}
                    </span>
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{
                        background: 'color-mix(in srgb, var(--text-muted) 15%, transparent)',
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(metric.value, 100)}%`,
                          background: metric.color,
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-medium w-10 text-right"
                      style={{ color: metric.color }}
                    >
                      {metric.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

function DomainHealth({ domains }: { domains: Domain[] }) {
  const hasIssues = domains.some(
    (d) => !d.spf || !d.dkim || !d.dmarc || !d.mx || d.blacklist
  )

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        <Globe size={18} className="inline mr-2" style={{ color: 'var(--accent-cyan)' }} />
        Domain Health
      </h2>

      {hasIssues && (
        <div
          className="rounded-lg p-3 mb-4 flex items-center gap-2"
          style={{
            background: 'color-mix(in srgb, var(--accent-rose) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-rose) 30%, transparent)',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--accent-rose)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--accent-rose)' }}>
            One or more domains have configuration issues. Check below for details.
          </span>
        </div>
      )}

      {domains.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Globe size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No domains configured</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left py-2 px-2 font-medium">Domain</th>
                <th className="text-center py-2 px-2 font-medium">SPF</th>
                <th className="text-center py-2 px-2 font-medium">DKIM</th>
                <th className="text-center py-2 px-2 font-medium">DMARC</th>
                <th className="text-center py-2 px-2 font-medium">MX</th>
                <th className="text-center py-2 px-2 font-medium">Blacklist</th>
                <th className="text-center py-2 px-2 font-medium">Warmup</th>
                <th className="text-center py-2 px-2 font-medium">Daily Limit</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr
                  key={d.domain}
                  className="border-t"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                    {d.domain}
                  </td>
                  {[
                    { ok: d.spf },
                    { ok: d.dkim },
                    { ok: d.dmarc },
                    { ok: d.mx },
                    { ok: !d.blacklist },
                  ].map((check, i) => (
                    <td key={i} className="text-center py-2 px-2">
                      {check.ok ? (
                        <CheckCircle2
                          size={14}
                          className="inline"
                          style={{ color: 'var(--accent-emerald)' }}
                        />
                      ) : (
                        <XCircle
                          size={14}
                          className="inline"
                          style={{ color: 'var(--accent-rose)' }}
                        />
                      )}
                    </td>
                  ))}
                  <td className="text-center py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                    Day {d.warmup_day}
                  </td>
                  <td className="text-center py-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {d.daily_send_limit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  )
}

function DailyStatsRow({ stats }: { stats: DailyStats }) {
  const items = [
    { label: 'Signals Today', value: stats.signals_detected, icon: Radio, accent: 'var(--accent-cyan)' },
    { label: 'Leads Enriched', value: stats.leads_enriched, icon: UserPlus, accent: 'var(--accent-purple)' },
    { label: 'Emails Validated', value: stats.emails_validated, icon: ShieldCheck, accent: 'var(--accent-blue)' },
    { label: 'Emails Sent', value: stats.emails_sent, icon: Send, accent: 'var(--accent-emerald)' },
    { label: 'Reply Queue', value: stats.reply_queue_size, icon: MessageSquareReply, accent: 'var(--accent-amber)' },
    { label: 'Daily Cost', value: `$${stats.daily_cost.toFixed(2)}`, icon: DollarSign, accent: 'var(--accent-rose)' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <GlassCard key={item.label} className="p-3 text-center">
            <Icon
              size={16}
              className="mx-auto mb-1"
              style={{ color: item.accent }}
            />
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {item.value}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </p>
          </GlassCard>
        )
      })}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const emptyData: OutreachData = {
  health: 'offline',
  metrics: { signals_today: 0, leads_enriched: 0, emails_sent: 0, hot_leads: 0 },
  funnel: {
    signals_detected: 0,
    leads_enriched: 0,
    emails_found: 0,
    emails_validated: 0,
    campaign_sent: 0,
    replies: 0,
    meetings_booked: 0,
  },
  signals: [],
  leads: [],
  replies: [],
  campaigns: [],
  domains: [],
  daily_stats: {
    signals_detected: 0,
    leads_enriched: 0,
    emails_validated: 0,
    emails_sent: 0,
    reply_queue_size: 0,
    daily_cost: 0,
  },
}

export default function OutreachPage() {
  const { data: outreachData, loading, refetch } = useOutreachData()
  const { data: stateData } = useOrchestratorState()
  const [lastRefresh] = useState<Date | null>(() => new Date())
  const [markedActioned, setMarkedActioned] = useState<Set<string>>(new Set())

  // Build the combined data object matching the old OutreachData shape
  const outreachState = stateData.outreach as Record<string, unknown> | null
  const data: OutreachData = {
    health: (outreachState?.health as OutreachData['health']) ?? 'offline',
    metrics: (outreachState?.metrics as OutreachData['metrics']) ?? emptyData.metrics,
    funnel: (outreachState?.funnel as OutreachData['funnel']) ?? emptyData.funnel,
    signals: (outreachData?.signals || []) as unknown as Signal[],
    leads: (outreachData?.leads || []) as unknown as Lead[],
    replies: ((outreachData?.replies || []) as unknown as Reply[]).map((r) =>
      markedActioned.has(r.id) ? { ...r, actioned: true } : r,
    ),
    campaigns: (outreachData?.campaigns || []) as unknown as Campaign[],
    domains: (outreachData?.domains || []) as unknown as Domain[],
    daily_stats: (outreachState?.daily_stats as DailyStats) ?? emptyData.daily_stats,
  }

  const handleMarkActioned = useCallback(
    async (id: string) => {
      setMarkedActioned((prev) => new Set(prev).add(id))
      try {
        await fetch('/api/outreach/replies', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, actioned: true }),
        })
        refetch()
      } catch {
        // optimistic update; ignore errors
      }
    },
    [refetch],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <RefreshCw
            size={32}
            className="mx-auto mb-3 animate-spin"
            style={{ color: 'var(--accent-cyan)' }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading outreach pipeline...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Sub-nav tabs */}
      <nav aria-label="Outreach sections" className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        <a href="/outreach" className="glass-button glass-button-primary text-sm px-4 py-2">Overview</a>
        <a href="/outreach/leads" className="glass-button text-sm px-4 py-2">Leads</a>
        <a href="/outreach/templates" className="glass-button text-sm px-4 py-2">Templates</a>
        <a href="/outreach/signals" className="glass-button text-sm px-4 py-2">Signals</a>
        <a href="/outreach/replies" className="glass-button text-sm px-4 py-2">Replies</a>
        <a href="/outreach/leads/new" className="glass-button glass-button-primary text-sm px-4 py-2 ml-auto">+ Add Lead</a>
      </nav>

      {/* Header + Pipeline Health */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
              color: 'var(--accent-cyan)',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Cold Outreach Pipeline
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <LiveIndicator status={data.health} label={`System ${data.health}`} />
              {lastRefresh && (
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Updated {formatTime(lastRefresh.toISOString())}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MetricPill
            icon={Radio}
            label="Signals Today"
            value={data.metrics.signals_today}
            accent="var(--accent-cyan)"
          />
          <MetricPill
            icon={UserPlus}
            label="Enriched"
            value={data.metrics.leads_enriched}
            accent="var(--accent-purple)"
          />
          <MetricPill
            icon={Send}
            label="Emails Sent"
            value={data.metrics.emails_sent}
            accent="var(--accent-blue)"
          />
          <MetricPill
            icon={Flame}
            label="Hot Leads"
            value={data.metrics.hot_leads}
            accent="var(--accent-rose)"
          />
        </div>
      </div>

      {/* Pipeline Funnel */}
      <PipelineFunnel funnel={data.funnel} />

      {/* Signal Feed + Reply Inbox side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SignalFeed signals={data.signals} />
        <ReplyInbox replies={data.replies} onMarkActioned={handleMarkActioned} />
      </div>

      {/* Lead Pipeline - full width kanban */}
      <LeadPipeline leads={data.leads} />

      {/* Campaign Performance + Domain Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignPerformance campaigns={data.campaigns} />
        <DomainHealth domains={data.domains} />
      </div>

      {/* Daily Stats Row */}
      <DailyStatsRow stats={data.daily_stats} />
    </div>
  )
}
