import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Server-side admin client using service role key.
 * Returns null if Supabase is not configured (placeholder/missing env vars).
 */
export function createAdminClient(): SupabaseClient | null {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key || url === 'placeholder' || key === 'placeholder' || url.includes('localhost:54321')) {
    return null
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return _client
}

/**
 * Safe query helper — returns empty result if Supabase is not configured.
 */
export function getSupabase() {
  const client = createAdminClient()
  if (!client) {
    return {
      available: false as const,
      client: null as unknown as SupabaseClient,
    }
  }
  return {
    available: true as const,
    client,
  }
}
