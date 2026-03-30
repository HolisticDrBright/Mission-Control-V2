#!/usr/bin/env node
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { server } from './server.js'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.MCP_SSE_PORT || '3100', 10)
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || crypto.randomBytes(32).toString('hex')
const CORS_ORIGINS = (process.env.MCP_CORS_ORIGINS || '*').split(',').map(s => s.trim())
const RATE_LIMIT_MAX = parseInt(process.env.MCP_RATE_LIMIT || '100', 10) // per minute per IP
const startTime = Date.now()

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, per IP)
// ---------------------------------------------------------------------------

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }

  bucket.count++
  return bucket.count <= RATE_LIMIT_MAX
}

// Clean stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(ip)
  }
}, 300000)

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

function setCorsHeaders(res: ServerResponse, origin: string | undefined) {
  const allowed = CORS_ORIGINS.includes('*') || (origin && CORS_ORIGINS.includes(origin))
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function checkAuth(req: IncomingMessage): boolean {
  const authHeader = req.headers.authorization
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === AUTH_TOKEN
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

let transport: SSEServerTransport | null = null

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const ip = req.socket.remoteAddress || 'unknown'
  const origin = req.headers.origin

  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin)
    res.writeHead(204)
    res.end()
    return
  }

  setCorsHeaders(res, origin)

  // Health check (no auth needed)
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      tools: 62,
      resources: 3,
      uptime_seconds: Math.round((Date.now() - startTime) / 1000),
      transport: 'sse',
    }))
    return
  }

  // Rate limit
  if (!checkRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Max 100 requests/min.' }))
    return
  }

  // Auth check for all other endpoints
  if (!checkAuth(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unauthorized. Provide Authorization: Bearer <token>' }))
    return
  }

  // SSE endpoint — establishes the event stream
  if (url.pathname === '/sse' && req.method === 'GET') {
    transport = new SSEServerTransport('/messages', res)
    await server.connect(transport)
    return
  }

  // Messages endpoint — receives JSON-RPC from client
  if (url.pathname === '/messages' && req.method === 'POST') {
    if (!transport) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'No active SSE connection. Connect to /sse first.' }))
      return
    }
    await transport.handlePostMessage(req, res)
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    error: 'Not found',
    endpoints: {
      'GET /health': 'Health check (no auth)',
      'GET /sse': 'SSE stream (requires Bearer token)',
      'POST /messages': 'JSON-RPC messages (requires Bearer token)',
    },
  }))
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`Mission Control MCP server (SSE) running on http://0.0.0.0:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)

  if (!process.env.MCP_AUTH_TOKEN) {
    console.log('\n⚠️  No MCP_AUTH_TOKEN set. Generated random token:')
    console.log(`   ${AUTH_TOKEN}`)
    console.log('   Set MCP_AUTH_TOKEN in your .env to use a fixed token.\n')
  }

  console.log('Endpoints:')
  console.log(`  GET  /health    — Health check (no auth)`)
  console.log(`  GET  /sse       — SSE stream (Bearer token required)`)
  console.log(`  POST /messages  — JSON-RPC messages (Bearer token required)`)
})

// Graceful shutdown
process.on('SIGINT', () => { httpServer.close(); process.exit(0) })
process.on('SIGTERM', () => { httpServer.close(); process.exit(0) })
