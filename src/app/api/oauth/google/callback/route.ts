import { NextRequest, NextResponse } from 'next/server'

// GET /api/oauth/google/callback — Exchange authorization code for tokens
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(
      htmlPage('Authorization Failed', `<p>Google returned an error: <strong>${error}</strong></p><p><a href="/api/oauth/google/auth">Try again</a></p>`),
      { headers: { 'Content-Type': 'text/html' } },
    )
  }

  if (!code) {
    return new NextResponse(
      htmlPage('Missing Code', '<p>No authorization code received from Google.</p><p><a href="/api/oauth/google/auth">Start over</a></p>'),
      { headers: { 'Content-Type': 'text/html' } },
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new NextResponse(
      htmlPage('Not Configured', '<p>GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from environment.</p>'),
      { headers: { 'Content-Type': 'text/html' } },
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${request.headers.get('host') || 'localhost:3001'}`
  const redirectUri = `${appUrl}/api/oauth/google/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      return new NextResponse(
        htmlPage('Token Exchange Failed', `<p>Google token error: <strong>${tokenData.error_description || tokenData.error || 'Unknown error'}</strong></p><p><a href="/api/oauth/google/auth">Try again</a></p>`),
        { headers: { 'Content-Type': 'text/html' } },
      )
    }

    const refreshToken = tokenData.refresh_token
    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in

    // Show the tokens to the user with copy instructions
    return new NextResponse(
      htmlPage('Google Search Console Connected!', `
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:20px;margin:20px 0">
          <h3 style="color:#10b981;margin:0 0 8px">Authorization Successful</h3>
          <p style="margin:0;color:#ccc">Google Search Console access has been granted.</p>
        </div>

        ${refreshToken ? `
        <h3>Refresh Token</h3>
        <p style="color:#999">Add this to your <code>.env</code> file on the server:</p>
        <pre style="background:#111;border:1px solid #333;border-radius:8px;padding:16px;overflow-x:auto;word-break:break-all;white-space:pre-wrap"><code>GOOGLE_REFRESH_TOKEN=${refreshToken}</code></pre>
        <button onclick="navigator.clipboard.writeText('GOOGLE_REFRESH_TOKEN=${refreshToken}').then(()=>this.textContent='Copied!')" style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin:8px 0">Copy to Clipboard</button>
        ` : '<p style="color:#f59e0b">No refresh token returned. This usually means the app was already authorized. Revoke access at <a href="https://myaccount.google.com/permissions" style="color:#3b82f6">Google Account Permissions</a> and try again.</p>'}

        <h3 style="margin-top:24px">Access Token <span style="color:#666;font-size:12px">(expires in ${expiresIn}s)</span></h3>
        <pre style="background:#111;border:1px solid #333;border-radius:8px;padding:16px;overflow-x:auto;font-size:11px;word-break:break-all;white-space:pre-wrap;max-height:100px"><code>${accessToken?.substring(0, 50)}...</code></pre>

        <h3 style="margin-top:24px">Next Steps</h3>
        <ol style="color:#ccc;line-height:2">
          <li>Copy the <code>GOOGLE_REFRESH_TOKEN</code> value above</li>
          <li>SSH into your server and add it to <code>.env</code></li>
          <li>Restart the service: <code>sudo systemctl restart mission-control-dashboard.service</code></li>
          <li>SEO data will sync automatically from Google Search Console</li>
        </ol>

        <p style="margin-top:24px"><a href="/seo-automation" style="color:#3b82f6">← Back to SEO Automation</a></p>
      `),
      { headers: { 'Content-Type': 'text/html' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new NextResponse(
      htmlPage('Error', `<p>Failed to exchange authorization code: <strong>${message}</strong></p><p><a href="/api/oauth/google/auth">Try again</a></p>`),
      { headers: { 'Content-Type': 'text/html' } },
    )
  }
}

// Simple HTML page with Mission Control styling
function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Mission Control</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #080b14; color: #eee; margin: 0; padding: 40px 20px; }
    .container { max-width: 640px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    h3 { color: #ddd; margin-top: 20px; }
    a { color: #3b82f6; }
    code { background: #1a1a2e; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    pre { font-size: 13px; }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${body}
  </div>
</body>
</html>`
}
