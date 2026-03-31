'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DataTable, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reply {
  id: string
  lead_name: string
  company: string
  category: string
  snippet: string
  received_at: string
  actioned: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutreachRepliesPage() {
  const supabase = createClient()

  const [replies, setReplies] = useState<Reply[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const pageSize = 25

  const fetchReplies = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count, error } = await supabase
        .from('mc_outreach_replies')
        .select('*', { count: 'exact' })
        .order('received_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (!error && data) {
        setReplies(data as Reply[])
        setTotal(count ?? 0)
      }
    } catch {
      // table may not exist
    } finally {
      setLoading(false)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReplies()
  }, [fetchReplies])

  const handleAction = async (id: string, update: Record<string, unknown>) => {
    try {
      const { error } = await supabase
        .from('mc_outreach_replies')
        .update(update)
        .eq('id', id)

      if (!error) {
        await fetchReplies()
      }
    } catch {
      // table may not exist
    }
  }

  type Row = Record<string, unknown>

  const columns = [
    { key: 'lead_name', label: 'Lead Name' },
    { key: 'company', label: 'Company' },
    {
      key: 'category',
      label: 'Category',
      render: (row: Row) => <StatusBadge status={(row.category as string) || 'unknown'} />,
    },
    {
      key: 'snippet',
      label: 'Snippet',
      render: (row: Row) => (
        <span className="truncate block max-w-[300px]" title={(row.snippet as string) || ''}>
          {(row.snippet as string) || '—'}
        </span>
      ),
    },
    {
      key: 'received_at',
      label: 'Date',
      render: (row: Row) =>
        row.received_at ? new Date(row.received_at as string).toLocaleDateString() : '—',
    },
    {
      key: 'actioned',
      label: 'Actioned',
      render: (row: Row) => (
        <StatusBadge status={row.actioned ? 'completed' : 'pending'} />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Row) => {
        const r = row as unknown as Reply
        return (
          <div className="flex gap-1">
            {!r.actioned && (
              <button
                type="button"
                className="glass-button text-xs px-2 py-1"
                onClick={(e) => { e.stopPropagation(); handleAction(r.id, { actioned: true }) }}
              >
                Mark Actioned
              </button>
            )}
            <button
              type="button"
              className="glass-button text-xs px-2 py-1"
              onClick={(e) => { e.stopPropagation(); handleAction(r.id, { category: 'interested', actioned: true }) }}
            >
              Positive
            </button>
            <button
              type="button"
              className="glass-button text-xs px-2 py-1"
              onClick={(e) => { e.stopPropagation(); handleAction(r.id, { category: 'not_interested', actioned: true }) }}
            >
              Negative
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <main className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Outreach', href: '/outreach' },
          { label: 'Replies' },
        ]}
      />

      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Outreach Replies
      </h1>

      <GlassCard>
        {loading ? (
          <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Loading replies...</p>
        ) : (
          <DataTable
            columns={columns as unknown as { key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]}
            rows={replies as unknown as Record<string, unknown>[]}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            emptyMessage="No replies yet."
          />
        )}
      </GlassCard>
    </main>
  )
}
