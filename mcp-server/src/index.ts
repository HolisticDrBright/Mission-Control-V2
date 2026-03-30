#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { server } from './server.js'

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Mission Control MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
