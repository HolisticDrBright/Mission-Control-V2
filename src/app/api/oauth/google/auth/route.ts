import { NextRequest, NextResponse } from 'next/server'

// GET /api/oauth/google/auth — Generate Google authorization URL
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 503 })
  }

  // Use the Host header so it works via SSH tunnel (localhost:3002)
  // or direct access (137.184.84.143:3001)
  const host = request.headers.get('host') || 'localhost:3001'
  const protocol = host.includes('localhost') ? 'http' : (request.headers.get('x-forwarded-proto') || 'http')
  const redirectUri = `${protocol}://${host}/api/oauth/google/callback`

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

  const wantsJson = request.headers.get('accept')?.includes('application/json')

  if (wantsJson) {
    return NextResponse.json({
      auth_url: authUrl,
      redirect_uri: redirectUri,
      instructions: 'Open the auth_url in your browser to authorize Google Search Console access.',
    })
  }

  return NextResponse.redirect(authUrl)
}
