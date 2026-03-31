'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { GlassForm, Field, TextArea, Select, DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import { createClient } from '@/lib/supabase/client'

interface Alert {
  id: string
  system: string
  severity: string
  issue: string
  action_needed: string | null
  acknowledged: boolean
  created_at: string
  [key: string]: unknown
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const supabase = createClient()

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('mc_alerts')
        .select('*')
        .order('created_at', { ascending: false })
      setAlerts((data as Alert[]) ?? [])
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const handleCreate = async (formData: Record<string, unknown>) => {
    try {
      const { error } = await supabase.from('mc_alerts').insert({
        system: formData.system,
        severity: formData.severity,
        issue: formData.issue,
        action_needed: formData.action_needed || null,
        acknowledged: false,
      })
      if (error) throw new Error(error.message)
      await fetchAlerts()
      setShowForm(false)
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to create alert')
    }
  }

  const handleAcknowledge = async (id: string) => {
    try {
      const { error } = await supabase.from('mc_alerts').update({ acknowledged: true }).eq('id', id)
      if (error) throw new Error(error.message)
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
    } catch {
      // ignore
    }
  }

  const columns = [
    { key: 'system', label: 'System', render: (row: Alert) => <StatusBadge status={row.system} /> },
    { key: 'severity', label: 'Severity', render: (row: Alert) => <StatusBadge status={row.severity} /> },
    { key: 'issue', label: 'Issue' },
    { key: 'action_needed', label: 'Action Needed' },
    {
      key: 'acknowledged',
      label: 'Ack',
      render: (row: Alert) =>
        row.acknowledged ? (
          <span className="text-xs" style={{ color: 'var(--accent-emerald)' }}>Yes</span>
        ) : (
          <button className="glass-button text-xs px-2 py-1" onClick={() => handleAcknowledge(row.id)}>
            Acknowledge
          </button>
        ),
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (row: Alert) => (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <section className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <Breadcrumbs items={[{ label: 'Mission Control', href: '/dashboard' }, { label: 'Alerts' }]} />

      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} style={{ color: 'var(--accent-amber)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Alerts</h1>
        </div>
        <button className="glass-button glass-button-primary text-sm flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showForm ? 'Hide Form' : 'Create Alert'}
        </button>
      </header>

      {showForm && (
        <GlassCard>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>New Alert</h2>
          <GlassForm onSubmit={handleCreate} submitLabel="Create Alert">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="System"
                name="system"
                required
                options={[
                  { value: 'seo', label: 'SEO' },
                  { value: 'outreach', label: 'Outreach' },
                  { value: 'cron', label: 'Cron' },
                  { value: 'budget', label: 'Budget' },
                ]}
              />
              <Select
                label="Severity"
                name="severity"
                required
                options={[
                  { value: 'critical', label: 'Critical' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'info', label: 'Info' },
                ]}
              />
            </div>
            <Field label="Issue" name="issue" required placeholder="Describe the issue..." />
            <TextArea label="Action Needed" name="action_needed" placeholder="What action should be taken?" rows={3} />
          </GlassForm>
        </GlassCard>
      )}

      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading alerts...</p>
        ) : (
          <DataTable columns={columns} rows={alerts} emptyMessage="No alerts found." />
        )}
      </GlassCard>
    </section>
  )
}
