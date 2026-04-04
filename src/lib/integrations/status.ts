import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface IntegrationStatus {
  status: 'ok'
  activeCount: number
  totalCount: number
  coverage: number
  integrations: Record<string, boolean>
  timestamp: string
}

/**
 * Read .env.integrations from the project root and return the bool map
 * of which integrations are configured. Shared by /api/integrations/status
 * and the server-rendered /integrations page so both use identical logic.
 */
export function getIntegrationStatus(): IntegrationStatus {
  const envPath = resolve(process.cwd(), '.env.integrations')
  const envContent = readFileSync(envPath, 'utf-8')

  const envVars = new Map<string, boolean>()
  for (const line of envContent.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue
    const [key, value] = line.split('=')
    if (key && value && value.trim()) {
      envVars.set(key.trim(), true)
    }
  }

  const integrations: Record<string, boolean> = {
    telegram: !!envVars.get('TELEGRAM_BOT_TOKEN'),
    manychat: !!envVars.get('MANYCHAT_API_KEY'),
    openai: !!envVars.get('OPENAI_API_KEY'),
    anthropic: !!envVars.get('ANTHROPIC_API_KEY_1'),
    mem0: !!envVars.get('MEM0_API_KEY'),
    heygen: !!envVars.get('HEYGEN_API_KEY'),
    elevenlabs: !!envVars.get('ELEVENLABS_API_KEY'),
    pexels: !!envVars.get('PEXELS_API_KEY'),
    genviral: !!envVars.get('GENVIRAL_API_KEY'),
    brave: !!envVars.get('BRAVE_API_KEY'),
    instantly: !!envVars.get('INSTANTLY_API_KEY'),
    wordpress: !!envVars.get('WORDPRESS_URL'),
    shopify: !!envVars.get('SHOPIFY_STORE'),
    gohighlevel: !!envVars.get('GOHIGHLEVEL_API_KEY'),
    stripe: !!envVars.get('STRIPE_API_KEY'),
    supabase: !!envVars.get('NEXT_PUBLIC_SUPABASE_URL'),
    digitalocean: !!envVars.get('DIGITALOCEAN_API_KEY'),
    googleConsole: !!envVars.get('GOOGLE_CLIENT_ID_MISSION_CONTROL'),
    googleOauth: !!envVars.get('GOOGLE_CLIENT_ID_MISSION_CONTROL'),
    polymarket: !!envVars.get('POLYMARKET_PRIVATE_KEY'),
    kraken: !!envVars.get('KRAKEN_API_KEY'),
    coinstats: !!envVars.get('COINSTATS_API_KEY'),
    alpaca: !!envVars.get('ALPACA_EMERGENCY_CODE'),
    sentry: !!envVars.get('SENTRY_DSN'),
    github: !!envVars.get('GITHUB_ACCESS_TOKEN'),
    apollo: false,
    hunter: false,
    debounce: false,
    notion: false,
  }

  const activeCount = Object.values(integrations).filter((v) => v === true).length
  const totalCount = Object.keys(integrations).length

  return {
    status: 'ok',
    activeCount,
    totalCount,
    coverage: Math.round((activeCount / totalCount) * 100),
    integrations,
    timestamp: new Date().toISOString(),
  }
}
