import { NextRequest, NextResponse } from 'next/server'
import { GET as csvGET } from '../google-console-csv/route'

/**
 * GET /api/seo/google-console
 *
 * Primary entrypoint for Google Search Console data.
 *
 * Strategy:
 *   1. (Future) Try OAuth-based GSC API if credentials are configured.
 *   2. Fall back to the CSV workaround endpoint, which reads per-site
 *      CSV exports from /tmp and supports ?site=holisticdrbright.com or
 *      ?site=dspiked.com.
 *
 * Query params: ?site=holisticdrbright.com (default) | dspiked.com
 */
export async function GET(request: NextRequest) {
  // OAuth path is not yet wired up — refresh token still pending from user.
  // When added, attempt OAuth first and only fall back on failure.
  const hasOAuth = Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN &&
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID &&
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
  )

  if (hasOAuth) {
    try {
      // Placeholder: real OAuth GSC fetch would go here.
      // For now we intentionally throw to force the CSV fallback.
      throw new Error('OAuth GSC fetch not yet implemented')
    } catch {
      // fall through to CSV
    }
  }

  return csvGET(request)
}
