import { getIntegrationStatus } from '@/lib/integrations/status'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(getIntegrationStatus())
  } catch (error) {
    console.error('Error reading integration status:', error)
    return Response.json(
      { error: 'Failed to read integration status', details: String(error) },
      { status: 500 },
    )
  }
}
