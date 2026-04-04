// Server component wrapper: legally exports route segment config to
// force dynamic rendering, then delegates to the client component that
// does the real work (fetching /api/integrations/status on mount).
export const dynamic = 'force-dynamic'
export const revalidate = 0

import IntegrationsClient from './IntegrationsClient'

export default function IntegrationsPage() {
  return <IntegrationsClient />
}
