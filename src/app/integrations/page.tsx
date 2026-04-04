import { CheckCircle, AlertCircle, Settings } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { getIntegrationStatus } from '@/lib/integrations/status'

// Force this page to be server-rendered on every request so it always
// reflects the current .env.integrations state.
export const dynamic = 'force-dynamic'

interface Integration {
  id: string
  statusKey?: string
  name: string
  category: string
  description: string
  icon: string
}

const INTEGRATIONS: Integration[] = [
  // COMMUNICATION
  { id: 'telegram', name: 'Telegram', category: 'Communication', description: '3 bots configured', icon: '💬' },
  { id: 'manychat', name: 'ManyChat', category: 'Communication', description: 'Social automation', icon: '📱' },

  // AI/LLM
  { id: 'openai', name: 'OpenAI', category: 'AI/LLM', description: 'ChatGPT API', icon: '🤖' },
  { id: 'anthropic', name: 'Anthropic', category: 'AI/LLM', description: '2x Claude keys', icon: '🧠' },
  { id: 'mem0', name: 'Mem0', category: 'AI/LLM', description: 'Memory & knowledge', icon: '💾' },

  // CONTENT & MEDIA
  { id: 'heygen', name: 'HeyGen', category: 'Content & Media', description: 'Avatar video generation', icon: '🎬' },
  { id: 'elevenlabs', name: 'ElevenLabs', category: 'Content & Media', description: 'Text-to-speech', icon: '🎙️' },
  { id: 'pexels', name: 'Pexels', category: 'Content & Media', description: 'Stock photos', icon: '📸' },
  { id: 'genviral', name: 'GenViral', category: 'Content & Media', description: 'Trending topics', icon: '✨' },

  // SEARCH & RESEARCH
  { id: 'brave', name: 'Brave Search', category: 'Search & Research', description: 'Keyword research', icon: '🔍' },
  { id: 'instantly', name: 'Instantly.ai', category: 'Search & Research', description: 'Cold email automation', icon: '📧' },

  // PUBLISHING
  { id: 'wordpress', name: 'WordPress', category: 'Publishing', description: 'holisticdrbright.com', icon: '📝' },

  // E-COMMERCE & PAYMENTS
  { id: 'shopify', name: 'Shopify', category: 'E-Commerce', description: 'DSpiked store', icon: '🛍️' },
  { id: 'gohighlevel', name: 'GoHighLevel', category: 'E-Commerce', description: 'CRM platform', icon: '🎯' },
  { id: 'stripe', name: 'Stripe', category: 'E-Commerce', description: 'Payment processing', icon: '💳' },

  // DATABASE & INFRA
  { id: 'supabase', name: 'Supabase', category: 'Database', description: 'PostgreSQL database', icon: '🗄️' },
  { id: 'digitalocean', name: 'DigitalOcean', category: 'Infrastructure', description: 'Cloud infrastructure', icon: '☁️' },

  // SEO & ANALYTICS — API returns camelCase keys, map via statusKey
  { id: 'google-console', statusKey: 'googleConsole', name: 'Google Search Console', category: 'Analytics', description: 'CSV workaround active', icon: '📊' },
  { id: 'google-oauth', statusKey: 'googleOauth', name: 'Google OAuth', category: 'Auth', description: '2 Client IDs configured', icon: '🔐' },

  // TRADING & CRYPTO
  { id: 'polymarket', name: 'Polymarket', category: 'Trading', description: '7 strategies active', icon: '📈' },
  { id: 'kraken', name: 'Kraken', category: 'Trading', description: 'Crypto exchange', icon: '₿' },
  { id: 'coinstats', name: 'Coinstats', category: 'Trading', description: 'Market data', icon: '💹' },
  { id: 'alpaca', name: 'Alpaca', category: 'Trading', description: 'Emergency code', icon: '🚨' },

  // MONITORING & DEVOPS
  { id: 'sentry', name: 'Sentry', category: 'Monitoring', description: 'Error tracking', icon: '⚠️' },
  { id: 'github', name: 'GitHub', category: 'DevOps', description: 'Source control', icon: '🐙' },

  // NEEDS SETUP
  { id: 'apollo', name: 'Apollo.io', category: 'Sales', description: 'Lead enrichment', icon: '🎯' },
  { id: 'hunter', name: 'Hunter.io', category: 'Sales', description: 'Email verification', icon: '🔎' },
  { id: 'debounce', name: 'DeBounce', category: 'Sales', description: 'List cleaning', icon: '✅' },
  { id: 'notion', name: 'Notion', category: 'Productivity', description: 'Project management', icon: '📋' },
]

export default function IntegrationsPage() {
  const status = getIntegrationStatus()
  const { activeCount, totalCount, coverage, integrations: activeMap } = status
  const setupRequiredCount = totalCount - activeCount

  const merged = INTEGRATIONS.map((integ) => ({
    ...integ,
    isActive: activeMap[integ.statusKey ?? integ.id] === true,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Connected Integrations
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {activeCount} Active • {setupRequiredCount} Setup Required • {totalCount} Total
        </p>
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

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {merged.map((integration) => (
          <GlassCard key={integration.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{integration.icon}</span>
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{
                    background: integration.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 146, 60, 0.2)',
                    color: integration.isActive ? '#10b981' : '#fb923c',
                  }}
                >
                  {integration.isActive ? '✅ Active' : '⚠️ Setup'}
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
              {integration.isActive ? 'Manage' : 'Setup'}
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
