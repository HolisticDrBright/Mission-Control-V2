'use client'

import { useState } from 'react'
import { Plus, Users, Calendar as CalIcon, AlertCircle } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'

const VA_COLUMNS = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'waiting_on_you', label: 'Waiting On You' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
] as const

interface MockVATask {
  id: string
  title: string
  assigned_to: string
  priority: string
  status: string
  due_date: string | null
}

export default function VATasksPage() {
  const [tasks] = useState<MockVATask[]>([])

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          VA Tasks
        </h2>
        <button className="glass-button-primary glass-button text-sm flex items-center gap-2">
          <Plus size={14} />
          New VA Task
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {VA_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          const isWaiting = col.id === 'waiting_on_you'

          return (
            <div key={col.id} className="min-w-[240px] max-w-[280px] flex-1">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{
                    color: isWaiting ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  }}
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
                        border: `1px solid ${
                          task.status === 'waiting_on_you'
                            ? 'rgba(245,158,11,0.2)'
                            : 'rgba(255,255,255,0.06)'
                        }`,
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          <Users size={10} />
                          {task.assigned_to}
                        </div>
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <CalIcon size={10} />
                            {new Date(task.due_date).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <StatusPill status={task.priority} size="sm" />
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
