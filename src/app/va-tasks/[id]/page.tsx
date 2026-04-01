'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Users, Clock, FileText } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import { GlassForm, Field, TextArea, Select, Breadcrumbs } from '@/components/ui/FormComponents'

interface VATask {
  id: string
  title: string
  description: string | null
  project_id: string | null
  assigned_to: string | null
  priority: string
  status: string
  due_date: string | null
  recurring: boolean
  recurrence_rule: string | null
  attachments: unknown[]
  notes: string | null
  notion_task_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_on_you', label: 'Waiting On You' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function VATaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<VATask | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/va-tasks?id=${taskId}`)
      if (res.ok) {
        const json = await res.json()
        // API returns array — find our task
        const tasks = json.data || []
        const found = Array.isArray(tasks) ? tasks.find((t: VATask) => t.id === taskId) : tasks
        if (found) setTask(found)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchTask() }, [fetchTask])

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch('/api/va-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
          ...(newStatus === 'done' ? { completed_at: new Date().toISOString() } : {}),
        }),
      })
      if (res.ok) {
        setMessage(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
        await fetchTask()
      }
    } catch {
      setMessage('Failed to update status')
    }
  }

  const handleSave = async (formData: Record<string, unknown>) => {
    const res = await fetch('/api/va-tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, ...formData }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to update task')
    }
    setEditing(false)
    setMessage('Task updated!')
    await fetchTask()
  }

  if (loading) {
    return <div className="p-6"><p style={{ color: 'var(--text-muted)' }}>Loading task...</p></div>
  }

  if (!task) {
    return (
      <div className="p-6">
        <Breadcrumbs items={[{ label: 'VA Tasks', href: '/va-tasks' }, { label: 'Not Found' }]} />
        <p style={{ color: 'var(--text-muted)' }}>Task not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'VA Tasks', href: '/va-tasks' }, { label: task.title }]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StatusPill status={task.status} size="sm" />
            <StatusPill status={task.priority} size="sm" />
          </div>
        </div>
        <button
          className="glass-button text-sm"
          onClick={() => setEditing(!editing)}
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Status message */}
      {message && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-emerald)' }}>
          {message}
        </div>
      )}

      {/* Quick status change */}
      <GlassCard className="p-4">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Change Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`glass-button text-xs px-3 py-1.5 ${task.status === opt.value ? 'glass-button-primary' : ''}`}
              onClick={() => handleStatusChange(opt.value)}
              disabled={task.status === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Detail view */}
      {!editing && (
        <GlassCard className="p-5">
          <dl className="space-y-4">
            {task.description && (
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Description</dt>
                <dd className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{task.description}</dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Assigned To</dt>
                <dd className="text-sm mt-1 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  <Users size={12} /> {task.assigned_to || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Priority</dt>
                <dd className="text-sm mt-1"><StatusPill status={task.priority} size="sm" /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Due Date</dt>
                <dd className="text-sm mt-1 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  <Calendar size={12} /> {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</dt>
                <dd className="text-sm mt-1"><StatusPill status={task.status} size="sm" /></dd>
              </div>
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Recurring</dt>
                <dd className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{task.recurring ? `Yes (${task.recurrence_rule || 'no rule'})` : 'No'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Created</dt>
                <dd className="text-sm mt-1 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  <Clock size={12} /> {new Date(task.created_at).toLocaleString()}
                </dd>
              </div>
            </div>
            {task.notes && (
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Notes</dt>
                <dd className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{task.notes}</dd>
              </div>
            )}
            {task.completed_at && (
              <div>
                <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Completed</dt>
                <dd className="text-sm mt-1" style={{ color: 'var(--accent-emerald)' }}>{new Date(task.completed_at).toLocaleString()}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Task ID</dt>
              <dd className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{task.id}</dd>
            </div>
          </dl>
        </GlassCard>
      )}

      {/* Edit form */}
      {editing && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Edit Task</h3>
          <GlassForm onSubmit={handleSave} submitLabel="Save Changes">
            <Field label="Title" name="title" required defaultValue={task.title} />
            <TextArea label="Description" name="description" defaultValue={task.description ?? ''} rows={4} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Assigned To" name="assigned_to" defaultValue={task.assigned_to ?? ''} />
              <Select label="Priority" name="priority" options={PRIORITY_OPTIONS} defaultValue={task.priority} />
              <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue={task.status} />
              <Field label="Due Date" name="due_date" type="date" defaultValue={task.due_date ?? ''} />
            </div>
            <TextArea label="Notes" name="notes" defaultValue={task.notes ?? ''} rows={3} />
          </GlassForm>
        </GlassCard>
      )}
    </div>
  )
}
