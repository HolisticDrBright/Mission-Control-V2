'use client'

import { useEffect, useState, useMemo } from 'react'
import { CheckCircle, AlertCircle, Settings } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'

interface Integration {
  id: string
  name: string
  category: string
  status: 'active' | 'setup-required' | 'error'
  lastVerified?: string
  envKey?: string
  description: string
  icon: string
  /** Optional key override if the API returns a different id shape */
  statusKey?: string
}

interface IntegrationStatusResponse {
  status: string
  activeCount: number
  totalCount: number
  coverage: number
  integrations: Record<string, boolean>
  timestamp: string
}

// Base integration catalog. The `status` field here is only used as a
// fallback while /api/integrations/status is loading or if the request
// fails — the real status is resolved from the API response.
const INTEGRATIONS: Integration[] = [
  // COMMUNICATION
  { id: 'telegram', name: 'Telegram', category: 'Communication', status: 'setup-required', envKey: 'TELEGRAM_BOT_TOKEN', description: '3 bots configured', icon: '💬' },
  { id: 'manychat', name: 'ManyChat', category: 'Communication', status: 'setup-required', envKey: 'MANYCHAT_API_KEY', description: 'Social automation', icon: '📱' },

  // AI/LLM
  { id: 'openai', name: 'OpenAI', category: 'AI/LLM', status: 'setup-required', envKey: 'OPENAI_API_KEY', description: 'ChatGPT API', icon: '🤖' },
  { id: 'anthropic', name: 'Anthropic', category: 'AI/LLM', status: 'setup-required', envKey: 'ANTHROPIC_API_KEY_1', description: '2x Claude keys', icon: '🧠' },
  { id: 'mem0', name: 'Mem0', category: 'AI/LLM', status: 'setup-required', envKey: 'MEM0_API_KEY', description: 'Memory & knowledge', icon: '💾' },

  // CONTENT & MEDIA
  { id: 'heygen', name: 'HeyGen', category: 'Content & Media', status: 'setup-required', envKey: 'HEYGEN_API_KEY', description: 'Avatar video generation', icon: '🎬' },
  { id: 'elevenlabs', name: 'ElevenLabs', category: 'Content & Media', status: 'setup-required', envKey: 'ELEVENLABS_API_KEY', description: 'Text-to-speech', icon: '🎙️' },
  { id: 'pexels', name: 'Pexels', category: 'Content & Media', status: 'setup-required', envKey: 'PEXELS_API_KEY', description: 'Stock photos', icon: '📸' },
  { id: 'genviral', name: 'GenViral', category: 'Content & Media', status: 'setup-required', envKey: 'GENVIRAL_API_KEY', description: 'Trending topics', icon: '✨' },

  // SEARCH & RESEARCH
  { id: 'brave', name: 'Brave Search', category: 'Search & Research', status: 'setup-required', envKey: 'BRAVE_API_KEY', description: 'Keyword research', icon: '🔍' },
  { id: 'instantly', name: 'Instantly.ai', category: 'Search & Research', status: 'setup-required', envKey: 'INSTANTLY_API_KEY', description: 'Cold email automation', icon: '📧' },

  // PUBLISHING
  { id: 'wordpress', name: 'WordPress', category: 'Publishing', status: 'setup-required', envKey: 'WORDPRESS_URL', description: 'holisticdrbright.com', icon: '📝' },

  // E-COMMERCE & PAYMENTS
  { id: 'shopify', name: 'Shopify', category: 'E-Commerce', status: 'setup-required', envKey: 'SHOPIFY_STORE', description: 'DSpiked store', icon: '🛍️' },
  { id: 'gohighlevel', name: 'GoHighLevel', category: 'E-Commerce', status: 'setup-required', envKey: 'GOHIGHLEVEL_API_KEY', description: 'CRM platform', icon: '🎯' },
  { id: 'stripe', name: 'Stripe', category: 'E-Commerce', status: 'setup-required', description: 'Payment processing', icon: '💳' },

  // DATABASE & STORAGE
  { id: 'supabase', name: 'Supabase', category: 'Database', status: 'setup-required', envKey: 'NEXT_PUBLIC_SUPABASE_URL', description: 'PostgreSQL database', icon: '🗄️' },
  { id: 'digitalocean', name: 'DigitalOcean', category: 'Infrastructure', status: 'setup-required', envKey: 'DIGITALOCEAN_API_KEY', description: 'Cloud infrastructure', icon: '☁️' },

  // SEO & ANALYTICS — API returns camelCase, map explicitly via statusKey
  { id: 'google-console', statusKey: 'googleConsole', name: 'Google Search Console', category: 'Analytics', status: 'setup-required', description: 'CSV workaround active', icon: '📊' },
  { id: 'google-oauth', statusKey: 'googleOauth', name: 'Google OAuth', category: 'Auth', status: 'setup-required', description: '2 Client IDs configured', icon: '🔐' },

  // TRADING & CRYPTO
  { id: 'polymarket', name: 'Polymarket', category: 'Trading', status: 'setup-required', envKey: 'POLYMARKET_PRIVATE_KEY', description: '7 strategies active', icon: '📈' },
  { id: 'kraken', name: 'Kraken', category: 'Trading', status: 'setup-required', envKey: 'KRAKEN_API_KEY', description: 'Crypto exchange', icon: '₿' },
  { id: 'coinstats', name: 'Coinstats', category: 'Trading', status: 'setup-required', envKey: 'COINSTATS_API_KEY', description: 'Market data', icon: '💹' },
  { id: 'alpaca', name: 'Alpaca', category: 'Trading', status: 'setup-required', envKey: 'ALPACA_EMERGENCY_CODE', description: 'Emergency code', icon: '🚨' },

  // MONITORING
  { id: 'sentry', name: 'Sentry', category: 'Monitoring', status: 'setup-required', envKey: 'SENTRY_DSN', description: 'Error tracking', icon: '⚠️' },
  { id: 'github', name: 'GitHub', category: 'DevOps', status: 'setup-required', envKey: 'GITHUB_ACCESS_TOKEN', description: 'Source control', icon: '🐙' },

  // NEEDS SETUP
  { id: 'apollo', name: 'Apollo.io', category: 'Sales', status: 'setup-required', description: 'Lead enrichment', icon: '🎯' },
  { id: 'hunter', name: 'Hunter.io', category: 'Sales', status: 'setup-required', description: 'Email verification', icon: '🔎' },
  { id: 'debounce', name: 'DeBounce', category: 'Sales', status: 'setup-required', description: 'List cleaning', icon: '✅' },
  { id: 'notion', name: 'Notion', category: 'Productivity', status: 'setup-required', description: 'Project management', icon: '📋' },
]

const CATEGORIES = ['Communication', 'AI/LLM', 'Content & Media', 'Search & Research', 'Publishing', 'E-Commerce', 'Database', 'Infrastructure', 'Analytics', 'Auth', 'Trading', 'Monitoring', 'DevOps', 'Sales', 'Productivity']

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusData, setStatusData] = useState<IntegrationStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch real status from /api/integrations/status on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/integrations/status')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) {
          setFetchError(json.error)
        } else {
          setStatusData(json)
        }
      })
      .catch((e) => !cancelled && setFetchError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Merge the static catalog with live status from the API.
  // Uses `statusKey` override when present (e.g. google-console → googleConsole).
  const integrations = useMemo<Integration[]>(() => {
    if (!statusData) return INTEGRATIONS
    return INTEGRATIONS.map((integ) => {
      const key = integ.statusKey ?? integ.id
      const isActive = statusData.integrations[key]
      return {
        ...integ,
        status: isActive === true ? 'active' : isActive === false ? 'setup-required' : integ.status,
      }
    })
  }, [statusData])

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesCategory = !selectedCategory || integration.category === selectedCategory
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Prefer API counters; fall back to counting locally while loading.
  const activeCount = statusData?.activeCount ?? integrations.filter((i) => i.status === 'active').length
  const totalCount = statusData?.totalCount ?? integrations.length
  const setupRequiredCount = totalCount - activeCount
  const coverage = statusData?.coverage ?? Math.round((activeCount / Math.max(totalCount, 1)) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Connected Integrations
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {loading
            ? 'Loading integration status…'
            : `${activeCount} Active • ${setupRequiredCount} Setup Required • ${totalCount} Total`}
        </p>
        {fetchError && (
          <p className="text-xs mt-1" style={{ color: '#f43f5e' }}>
            Failed to load live status: {fetchError}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active Integrations</p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-emerald)' }}>{activeCount}</p>
            </div>
            <CheckCircle size={40} color="var(--accent-emerald)" />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Setup Required</p>
              <p className="text-3xl font-bold mt-2" style={{ color: 'var(--accent-amber)' }}>{setupRequiredCount}</p>
            </div>
            <AlertCircle size={40} color="var(--accent-amber)" />
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Coverage</p>
              <p className="text-3xl font-bold mt-2">{coverage}%</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </GlassCard>
      </div>

      {/* Search & Filter */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        />

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1 rounded-full text-sm transition ${!selectedCategory ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1 rounded-full text-sm transition ${selectedCategory === category ? 'bg-blue-500' : 'bg-gray-700'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => (
          <GlassCard key={integration.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{integration.icon}</span>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{
                    background: integration.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 146, 60, 0.2)',
                    color: integration.status === 'active' ? '#10b981' : '#fb923c',
                  }}
                >
                  {integration.status === 'active' ? '✅ Active' : '⚠️ Setup'}
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                {integration.name}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {integration.description}
              </p>
              {integration.category && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {integration.category}
                </p>
              )}
            </div>
            <button className="mt-4 w-full py-2 rounded-lg text-sm font-medium transition" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
              <Settings size={14} className="inline mr-2" />
              {integration.status === 'active' ? 'Manage' : 'Setup'}
            </button>
          </GlassCard>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <GlassCard className="p-8 text-center">
          <p style={{ color: 'var(--text-muted)' }}>No integrations found matching your search.</p>
        </GlassCard>
      )}
    </div>
  )
}
