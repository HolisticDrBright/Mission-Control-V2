import { NextRequest } from 'next/server'

/**
 * Authenticate API requests.
 * - Internal browser requests (same-origin, no auth header) are allowed in dev
 * - External requests need Bearer token matching MC_API_TOKEN
 * - If MC_API_TOKEN is not set, all requests are allowed (dev mode)
 */
export function authenticate(req: NextRequest): boolean {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.MC_API_TOKEN

  // No token configured = fully open (dev mode)
  if (!expected) return true

  // Has valid bearer token
  if (token === expected) return true

  // Allow same-origin requests without token (browser fetches from pages)
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

  if (origin && origin.startsWith(appUrl)) return true
  if (referer && referer.startsWith(appUrl)) return true

  // Next.js internal requests (SSR, server components) — no origin/referer
  // Check for Next.js specific headers
  const isNextInternal = req.headers.get('x-nextjs-data') !== null
    || req.headers.get('rsc') !== null
    || req.nextUrl.pathname.startsWith('/api/')

  // In development, allow all requests from localhost
  if (process.env.NODE_ENV !== 'production') {
    const host = req.headers.get('host') || ''
    if (host.includes('localhost') || host.includes('127.0.0.1')) return true
  }

  return isNextInternal
}
