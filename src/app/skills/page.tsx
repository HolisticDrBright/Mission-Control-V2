'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Globe, Code, FolderOpen, Database, Plug, Monitor, GitBranch, Brain,
  Cpu, PenTool, CheckCircle, AlertTriangle, XCircle, Search, Zap,
  Mail, Video, RefreshCw, BarChart3, ShoppingBag, CreditCard,
  Mic, Image, UserCheck, Send, BookOpen, Link2, ArrowUpCircle,
  Megaphone, Target, ChevronDown, Package,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { Breadcrumbs } from '@/components/ui/FormComponents'
import { CATEGORY_COLORS, type SkillCategory } from '@/lib/openclaw/skill-catalog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CapabilityStatus = 'ready'
type IntegrationStatus = 'configured' | 'needs_setup' | 'unavailable'

interface Capability {
  name: string
  description: string
  status: CapabilityStatus
  icon: React.ElementType
}

interface Integration {
  name: string
  description: string
  status: IntegrationStatus
  icon: React.ElementType
}

interface AutomationTemplate {
  name: string
  description: string
  requires: string[]
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const capabilities: Capability[] = [
  { name: 'Web Research (Brave Search)', description: 'Search the web, analyze trends, discover opportunities', status: 'ready', icon: Globe },
  { name: 'Code Generation', description: 'Write, review, debug code in any language', status: 'ready', icon: Code },
  { name: 'File Management', description: 'Read, write, organize files and directories', status: 'ready', icon: FolderOpen },
  { name: 'Database Operations (Supabase)', description: 'CRUD operations on all Mission Control tables', status: 'ready', icon: Database },
  { name: 'API Integrations', description: 'Connect to and orchestrate external APIs', status: 'ready', icon: Plug },
  { name: 'Browser Automation', description: 'Navigate websites, fill forms, extract data', status: 'ready', icon: Monitor },
  { name: 'Workflow Orchestration', description: 'Chain multi-step automated workflows', status: 'ready', icon: GitBranch },
  { name: 'Memory Management', description: 'Persistent memory across sessions', status: 'ready', icon: Brain },
  { name: 'LLM Operations', description: 'Route tasks to appropriate AI models', status: 'ready', icon: Cpu },
  { name: 'Content Creation', description: 'Write articles, emails, social posts, scripts', status: 'ready', icon: PenTool },
]

const integrations: Integration[] = [
  { name: 'OpenClaw Gateway', description: 'Central AI gateway for model routing and orchestration', status: process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL ? 'configured' : 'needs_setup', icon: Zap },
  { name: 'Supabase', description: 'PostgreSQL database, auth, and realtime subscriptions', status: 'configured', icon: Database },
  { name: 'WordPress', description: 'Publish and manage blog content across sites', status: 'needs_setup', icon: BookOpen },
  { name: 'GoHighLevel', description: 'CRM, funnels, and marketing automation', status: 'needs_setup', icon: Megaphone },
  { name: 'Shopify', description: 'E-commerce store management and order tracking', status: 'needs_setup', icon: ShoppingBag },
  { name: 'Google Search Console', description: 'SEO performance data and indexing status', status: 'needs_setup', icon: Search },
  { name: 'Stripe', description: 'Payment processing and subscription management', status: 'needs_setup', icon: CreditCard },
  { name: 'HeyGen', description: 'AI avatar video generation', status: 'needs_setup', icon: Video },
  { name: 'GenViral', description: 'Viral short-form video assembly pipeline', status: 'needs_setup', icon: ArrowUpCircle },
  { name: 'ElevenLabs', description: 'AI voice synthesis and cloning', status: 'needs_setup', icon: Mic },
  { name: 'Pexels', description: 'Stock photos and b-roll video sourcing', status: 'needs_setup', icon: Image },
  { name: 'Hunter.io', description: 'Email finder and domain search', status: 'needs_setup', icon: Mail },
  { name: 'DeBounce', description: 'Email verification and list cleaning', status: 'needs_setup', icon: CheckCircle },
  { name: 'Instantly.ai', description: 'Cold email sending and warm-up', status: 'needs_setup', icon: Send },
  { name: 'Apollo.io', description: 'B2B contact database and enrichment', status: 'needs_setup', icon: Target },
  { name: 'Notion', description: 'Docs, wikis, and project management sync', status: 'needs_setup', icon: BookOpen },
]

const integrationStatusMap = new Map(integrations.map((i) => [i.name, i.status]))

const automationTemplates: AutomationTemplate[] = [
  { name: 'Cold Outreach Campaign', requires: ['Hunter.io', 'Apollo.io', 'Instantly.ai'], description: 'Signal detection \u2192 enrichment \u2192 email discovery \u2192 campaign launch' },
  { name: 'SEO Content Pipeline', requires: ['Web Research (Brave Search)', 'WordPress'], description: 'Trend discovery \u2192 keyword research \u2192 content creation \u2192 publishing' },
  { name: 'Email Sequence', requires: ['Instantly.ai'], description: 'Multi-step follow-up email sequence with personalization' },
  { name: 'UGC Viral Reel', requires: ['HeyGen', 'Pexels', 'GenViral'], description: 'Script \u2192 avatar \u2192 b-roll \u2192 assembly \u2192 publish' },
  { name: 'Data Sync', requires: ['Notion', 'Supabase'], description: 'Bi-directional sync between Mission Control and Notion' },
  { name: 'Performance Report', requires: ['Supabase'], description: 'Generate weekly report across all systems' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
  if (status === 'ready' || status === 'configured') return '#10b981'
  if (status === 'needs_setup') return '#f59e0b'
  return '#f43f5e'
}

function StatusIcon({ status }: { status: string }) {
  const color = statusColor(status)
  if (status === 'ready' || status === 'configured') return <CheckCircle size={14} color={color} />
  if (status === 'needs_setup') return <AlertTriangle size={14} color={color} />
  return <XCircle size={14} color={color} />
}

function StatusLabel({ status }: { status: string }) {
  const color = statusColor(status)
  const label = status === 'ready' ? 'Ready' : status === 'configured' ? 'Configured' : status === 'needs_setup' ? 'Needs Setup' : 'Unavailable'
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <StatusIcon status={status} />
      {label}
    </span>
  )
}

function templateStatus(requires: string[]): IntegrationStatus {
  const statuses = requires.map((r) => {
    // Check integrations map first, then check capabilities (always ready)
    const intStatus = integrationStatusMap.get(r)
    if (intStatus) return intStatus
    const cap = capabilities.find((c) => c.name === r)
    if (cap) return 'configured' as IntegrationStatus
    return 'needs_setup' as IntegrationStatus
  })
  if (statuses.some((s) => s === 'unavailable')) return 'unavailable'
  if (statuses.some((s) => s === 'needs_setup')) return 'needs_setup'
  return 'configured'
}

// ---------------------------------------------------------------------------
// OpenClaw Skills section
// ---------------------------------------------------------------------------

interface OpenClawSkill {
  name: string
  category: SkillCategory
  description: string
  source: 'filesystem' | 'catalog'
}

interface OpenClawSkillsResponse {
  total: number
  source: 'filesystem' | 'catalog'
  skillsDir: string | null
  byCategory: Record<string, number>
  skills: OpenClawSkill[]
}

function OpenClawSkillsSection({ searchQuery }: { searchQuery: string }) {
  const [data, setData] = useState<OpenClawSkillsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/openclaw/skills')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) setError(json.error)
        else setData(json)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const q = searchQuery.toLowerCase()

  const filtered = useMemo(() => {
    if (!data) return []
    if (!q) return data.skills
    return data.skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    )
  }, [data, q])

  const grouped = useMemo(() => {
    const g = new Map<SkillCategory, OpenClawSkill[]>()
    for (const s of filtered) {
      const list = g.get(s.category) ?? []
      list.push(s)
      g.set(s.category, list)
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <section aria-labelledby="openclaw-skills-heading">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2
          id="openclaw-skills-heading"
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          OpenClaw Skills
        </h2>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{
              background: 'rgba(139,92,246,0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(139,92,246,0.3)',
            }}
          >
            <Package size={12} />
            {data ? `${data.total} Skills Available` : loading ? 'Loading…' : '0 Skills'}
          </span>
          {data && (
            <span
              className="text-[10px] px-2 py-0.5 rounded"
              style={{
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              title={data.skillsDir ?? 'Using built-in catalog fallback'}
            >
              {data.source === 'filesystem' ? 'from filesystem' : 'from catalog'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs mb-3" style={{ color: '#f43f5e' }}>
          Failed to load skills: {error}
        </p>
      )}

      {loading && !data && (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          Loading OpenClaw skills…
        </p>
      )}

      {data && grouped.length === 0 && (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          No skills match your search.
        </p>
      )}

      <div className="space-y-6">
        {grouped.map(([category, skills]) => {
          const color = CATEGORY_COLORS[category] ?? '#64748b'
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                  {category}
                </h3>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {skills.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {skills.map((skill) => {
                  const isOpen = expanded === skill.name
                  return (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : skill.name)}
                      className="text-left p-2.5 rounded-lg transition-all"
                      style={{
                        background: isOpen
                          ? `color-mix(in srgb, ${color} 14%, transparent)`
                          : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isOpen ? color : 'rgba(255,255,255,0.08)'}`,
                        gridColumn: isOpen ? 'span 2' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-xs font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {skill.name}
                        </span>
                        <ChevronDown
                          size={12}
                          style={{
                            color,
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            flexShrink: 0,
                          }}
                        />
                      </div>
                      {isOpen && skill.description && (
                        <p
                          className="text-[11px] mt-1.5 leading-snug"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {skill.description}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SkillsPage() {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const filteredCapabilities = useMemo(
    () => capabilities.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)),
    [q],
  )
  const filteredIntegrations = useMemo(
    () => integrations.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
    [q],
  )
  const filteredTemplates = useMemo(
    () => automationTemplates.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    [q],
  )

  return (
    <section className="p-6 space-y-8 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[{ label: 'Mission Control', href: '/dashboard' }, { label: 'Skills Registry' }]} />

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Skills Registry</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Capabilities, integrations, and automation templates</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            placeholder="Search skills, integrations, templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full text-sm pl-9"
          />
        </div>
      </header>

      {/* Section A: Core Capabilities */}
      <section aria-labelledby="capabilities-heading">
        <h2 id="capabilities-heading" className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Core Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCapabilities.map((cap) => {
            const Icon = cap.icon
            return (
              <GlassCard key={cap.name} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <Icon size={18} style={{ color: '#10b981' }} />
                  </div>
                  <StatusLabel status={cap.status} />
                </div>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cap.name}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{cap.description}</p>
                </div>
              </GlassCard>
            )
          })}
          {filteredCapabilities.length === 0 && (
            <p className="text-sm col-span-full py-6 text-center" style={{ color: 'var(--text-muted)' }}>No capabilities match your search.</p>
          )}
        </div>
      </section>

      {/* Section B: Available Integrations */}
      <section aria-labelledby="integrations-heading">
        <h2 id="integrations-heading" className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Available Integrations
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIntegrations.map((integ) => {
            const Icon = integ.icon
            const color = statusColor(integ.status)
            return (
              <GlassCard key={integ.name} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg" style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <StatusLabel status={integ.status} />
                </div>
                <div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{integ.name}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{integ.description}</p>
                </div>
              </GlassCard>
            )
          })}
          {filteredIntegrations.length === 0 && (
            <p className="text-sm col-span-full py-6 text-center" style={{ color: 'var(--text-muted)' }}>No integrations match your search.</p>
          )}
        </div>
      </section>

      {/* Section C: OpenClaw Skills (dynamic, filesystem-backed) */}
      <OpenClawSkillsSection searchQuery={search} />

      {/* Section D: Automation Templates */}
      <section aria-labelledby="templates-heading">
        <h2 id="templates-heading" className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Automation Templates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const tplStatus = templateStatus(tpl.requires)
            return (
              <GlassCard key={tpl.name} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{tpl.name}</h3>
                  <StatusLabel status={tplStatus} />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tpl.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {tpl.requires.map((r) => {
                    const rStatus = integrationStatusMap.get(r) ?? (capabilities.find((c) => c.name === r) ? 'configured' : 'needs_setup')
                    const rColor = statusColor(rStatus)
                    return (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          background: `color-mix(in srgb, ${rColor} 10%, transparent)`,
                          color: rColor,
                          border: `1px solid color-mix(in srgb, ${rColor} 20%, transparent)`,
                        }}
                      >
                        {rStatus === 'configured' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                        {r}
                      </span>
                    )
                  })}
                </div>
              </GlassCard>
            )
          })}
          {filteredTemplates.length === 0 && (
            <p className="text-sm col-span-full py-6 text-center" style={{ color: 'var(--text-muted)' }}>No templates match your search.</p>
          )}
        </div>
      </section>
    </section>
  )
}
