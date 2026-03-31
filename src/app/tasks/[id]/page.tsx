'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassForm, Field, TextArea, Select, StatusBadge, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'
import type { Task, TaskActivityEntry } from '@/lib/types'

type Params = Promise<{ id: string }>

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'review', label: 'Review' },
  { value: 'testing', label: 'Testing' },
  { value: 'done', label: 'Done' },
]

const QUADRANT_OPTIONS = [
  { value: 'do', label: 'Do First' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'delegate', label: 'Delegate' },
  { value: 'eliminate', label: 'Eliminate' },
]

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function TaskDetailPage({ params }: { params: Params }) {
  const { id } = use(params)
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickMsg, setQuickMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error)
        setTask(data as Task | null)
        setLoading(false)
      })
  }, [id])

  const quickStatus = async (newStatus: string) => {
    setQuickMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ kanban_status: newStatus }).eq('id', id)
    if (error) {
      setQuickMsg(`Error: ${error.message}`)
    } else {
      setTask((prev) => prev ? { ...prev, kanban_status: newStatus as Task['kanban_status'] } : prev)
      setQuickMsg(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
    }
  }

  const handleUpdate = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    // refresh local state
    const { data: fresh } = await supabase.from('tasks').select('*').eq('id', id).single()
    if (fresh) setTask(fresh as Task)
  }

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: 'var(--text-muted)' }}>Loading task...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="p-6">
        <p style={{ color: 'var(--text-muted)' }}>Task not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto">
      <Breadcrumbs items={[{ label: 'Tasks', href: '/tasks' }, { label: task.title }]} />

      {/* Task Summary */}
      <GlassCard className="p-5">
        <h1 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {task.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <StatusBadge status={task.kanban_status} />
          <StatusBadge status={task.priority} />
          {task.quadrant && <StatusBadge status={task.quadrant} />}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Type: {task.type}</span>
          {task.estimated_minutes != null && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Est: {task.estimated_minutes}m</span>
          )}
        </div>
        {task.description && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
        )}
        {task.notes && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            <strong>Notes:</strong> {task.notes}
          </p>
        )}
        {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Acceptance Criteria</p>
            <ul className="list-disc list-inside text-sm" style={{ color: 'var(--text-secondary)' }}>
              {task.acceptance_criteria.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Agent: {task.agent_id || '—'} &middot; Project: {task.project_id || '—'} &middot; Created: {new Date(task.created_at).toLocaleDateString()}
        </div>
      </GlassCard>

      {/* Quick Status Buttons */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Quick Status Change</h2>
        <div className="flex flex-wrap gap-2">
          <button className="glass-button text-sm px-4 py-2" onClick={() => quickStatus('in_progress')}>
            Move to In Progress
          </button>
          <button className="glass-button text-sm px-4 py-2" onClick={() => quickStatus('review')}>
            Move to Review
          </button>
          <button className="glass-button text-sm px-4 py-2" onClick={() => quickStatus('done')}>
            Mark Done
          </button>
        </div>
        {quickMsg && (
          <p className="text-xs mt-2" style={{ color: quickMsg.startsWith('Error') ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
            {quickMsg}
          </p>
        )}
      </GlassCard>

      {/* Edit Form */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Edit Task</h2>
        <GlassForm onSubmit={handleUpdate} submitLabel="Update Task">
          <Field label="Title" name="title" required defaultValue={task.title} />
          <TextArea label="Description" name="description" defaultValue={task.description ?? ''} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select label="Kanban Status" name="kanban_status" options={STATUS_OPTIONS} defaultValue={task.kanban_status} />
            <Select label="Quadrant" name="quadrant" options={QUADRANT_OPTIONS} defaultValue={task.quadrant ?? ''} />
            <Select label="Priority" name="priority" options={PRIORITY_OPTIONS} defaultValue={task.priority} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Agent ID" name="agent_id" defaultValue={task.agent_id ?? ''} />
            <Field label="Project ID" name="project_id" defaultValue={task.project_id ?? ''} />
          </div>
          <Field label="Estimated Minutes" name="estimated_minutes" type="number" dataType="number" defaultValue={task.estimated_minutes ?? ''} />
          <TextArea label="Notes" name="notes" defaultValue={task.notes ?? ''} rows={3} />
        </GlassForm>
      </GlassCard>

      {/* Activity Log */}
      <GlassCard className="p-5">
        <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Activity Log</h2>
        {task.activity_log && task.activity_log.length > 0 ? (
          <div className="space-y-2">
            {task.activity_log.map((entry: TaskActivityEntry, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>{entry.event}</span>
                {entry.details && (
                  <span style={{ color: 'var(--text-secondary)' }}>— {entry.details}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity recorded yet.</p>
        )}
      </GlassCard>
    </div>
  )
}
