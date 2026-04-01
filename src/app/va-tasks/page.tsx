'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, Calendar as CalIcon } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import { GlassForm, Field, TextArea, Select } from '@/components/ui/FormComponents'

const VA_COLUMNS = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'waiting_on_you', label: 'Waiting On You' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
] as const

interface VATask {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  priority: string
  status: string
  due_date: string | null
  project_id: string | null
  notes: string | null
  created_at: string
}

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const STATUS_OPTIONS = VA_COLUMNS.map(c => ({ value: c.id, label: c.label }))

export default function VATasksPage() {
  const [tasks, setTasks] = useState<VATask[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('va_tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTasks(data as VATask[])
      } else {
        setTasks([])
      }
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleCreate = async (formData: Record<string, unknown>) => {
    const res = await fetch('/api/va-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to || null,
        priority: formData.priority || 'medium',
        status: formData.status || 'pending',
        due_date: formData.due_date || null,
        notes: formData.notes || null,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create task')
    }
    setShowForm(false)
    await fetchTasks()
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/va-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      })
      if (res.ok) await fetchTasks()
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p style={{ color: 'var(--text-muted)' }}>Loading VA tasks...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          VA Tasks <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>({tasks.length})</span>
        </h2>
        <button
          className="glass-button-primary glass-button text-sm flex items-center gap-2"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={14} />
          {showForm ? 'Cancel' : 'New VA Task'}
        </button>
      </div>

      {showForm && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Create VA Task</h3>
          <GlassForm onSubmit={handleCreate} submitLabel="Create Task">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Title" name="title" required placeholder="Task title" />
              <Field label="Assigned To" name="assigned_to" placeholder="VA name or role" />
              <Select label="Priority" name="priority" options={PRIORITY_OPTIONS} defaultValue="medium" />
              <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue="pending" />
              <Field label="Due Date" name="due_date" type="date" />
            </div>
            <TextArea label="Description" name="description" placeholder="Task details..." rows={3} />
            <TextArea label="Notes" name="notes" placeholder="Internal notes..." rows={2} />
          </GlassForm>
        </GlassCard>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {VA_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          const isWaiting = col.id === 'waiting_on_you'

          return (
            <div key={col.id} className="min-w-[240px] max-w-[280px] flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: isWaiting ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
                >
                  {col.label}
                </h3>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                >
                  {colTasks.length}
                </span>
              </div>
              <div
                className="p-2 rounded-xl min-h-[300px] space-y-2"
                style={{
                  background: isWaiting ? 'rgba(245,158,11,0.03)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isWaiting ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                {colTasks.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No tasks
                  </p>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${task.status === 'waiting_on_you' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {task.assigned_to && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <Users size={10} />
                            {task.assigned_to}
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <CalIcon size={10} />
                            {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <StatusPill status={task.priority} size="sm" />
                        {/* Quick status change */}
                        {task.status !== 'done' && (
                          <button
                            className="text-[10px] px-2 py-0.5 rounded glass-button"
                            onClick={() => {
                              const nextStatus: Record<string, string> = {
                                pending: 'in_progress',
                                in_progress: 'review',
                                waiting_on_you: 'in_progress',
                                review: 'done',
                              }
                              handleStatusChange(task.id, nextStatus[task.status] || 'done')
                            }}
                          >
                            {task.status === 'pending' ? 'Start' : task.status === 'in_progress' ? 'To Review' : task.status === 'review' ? 'Done' : 'Resume'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
