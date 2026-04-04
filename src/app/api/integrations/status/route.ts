import { readFileSync } from 'fs'
import { resolve } from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Read the .env.integrations file
    const envPath = resolve(process.cwd(), '.env.integrations')
    const envContent = readFileSync(envPath, 'utf-8')

    // Parse env variables
    const envVars = new Map<string, boolean>()
    const lines = envContent.split('\n')

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue
      const [key, value] = line.split('=')
      if (key && value && value.trim()) {
        envVars.set(key.trim(), true)
      }
    }

    // Map of integration env keys
    const integrationStatus = {
      // COMMUNICATION
      telegram: !!envVars.get('TELEGRAM_BOT_TOKEN'),
      manychat: !!envVars.get('MANYCHAT_API_KEY'),

      // AI/LLM
      openai: !!envVars.get('OPENAI_API_KEY'),
      anthropic: !!envVars.get('ANTHROPIC_API_KEY_1'),
      mem0: !!envVars.get('MEM0_API_KEY'),

      // CONTENT & MEDIA
      heygen: !!envVars.get('HEYGEN_API_KEY'),
      elevenlabs: !!envVars.get('ELEVENLABS_API_KEY'),
      pexels: !!envVars.get('PEXELS_API_KEY'),
      genviral: !!envVars.get('GENVIRAL_API_KEY'),

      // SEARCH & RESEARCH
      brave: !!envVars.get('BRAVE_API_KEY'),
      instantly: !!envVars.get('INSTANTLY_API_KEY'),

      // PUBLISHING
      wordpress: !!envVars.get('WORDPRESS_URL'),

      // E-COMMERCE & PAYMENTS
      shopify: !!envVars.get('SHOPIFY_STORE'),
      gohighlevel: !!envVars.get('GOHIGHLEVEL_API_KEY'),
      stripe: !!envVars.get('STRIPE_API_KEY'),

      // DATABASE & STORAGE
      supabase: !!envVars.get('NEXT_PUBLIC_SUPABASE_URL'),
      digitalocean: !!envVars.get('DIGITALOCEAN_API_KEY'),

      // SEO & ANALYTICS
      googleConsole: !!envVars.get('GOOGLE_CLIENT_ID_MISSION_CONTROL'),
      googleOauth: !!envVars.get('GOOGLE_CLIENT_ID_MISSION_CONTROL'),

      // TRADING & CRYPTO
      polymarket: !!envVars.get('POLYMARKET_PRIVATE_KEY'),
      kraken: !!envVars.get('KRAKEN_API_KEY'),
      coinstats: !!envVars.get('COINSTATS_API_KEY'),
      alpaca: !!envVars.get('ALPACA_EMERGENCY_CODE'),

      // MONITORING
      sentry: !!envVars.get('SENTRY_DSN'),
      github: !!envVars.get('GITHUB_ACCESS_TOKEN'),

      // NEEDS SETUP
      apollo: false,
      hunter: false,
      debounce: false,
      notion: false,
    }

    const activeCount = Object.values(integrationStatus).filter((v) => v === true).length
    const totalCount = Object.keys(integrationStatus).length

    return Response.json({
      status: 'ok',
      activeCount,
      totalCount,
      coverage: Math.round((activeCount / totalCount) * 100),
      integrations: integrationStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error reading integration status:', error)
    return Response.json(
      { error: 'Failed to read integration status', details: String(error) },
      { status: 500 },
    )
  }
}
