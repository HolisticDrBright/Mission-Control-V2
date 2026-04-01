import { NextRequest, NextResponse } from 'next/server'

// GET /api/oauth/google/auth — Generate Google authorization URL
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 503 })
  }

  // Determine callback URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${request.headers.get('host') || 'localhost:3001'}`
  const redirectUri = `${appUrl}/api/oauth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  // Return both a redirect and the URL as JSON (useful for API callers)
  const wantsJson = request.headers.get('accept')?.includes('application/json')

  if (wantsJson) {
    return NextResponse.json({
      auth_url: authUrl,
      redirect_uri: redirectUri,
      instructions: 'Open the auth_url in your browser to authorize Google Search Console access.',
    })
  }

  // Redirect the browser directly to Google
  return NextResponse.redirect(authUrl)
}
