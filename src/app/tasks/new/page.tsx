'use client'

import { useRouter } from 'next/navigation'
import { GlassForm, Field, TextArea, Select, Breadcrumbs } from '@/components/ui/FormComponents'
import GlassCard from '@/components/ui/GlassCard'

const TYPE_OPTIONS = [
  { value: 'plan', label: 'Plan' },
  { value: 'build', label: 'Build' },
  { value: 'ops', label: 'Ops' },
  { value: 'research', label: 'Research' },
  { value: 'content', label: 'Content' },
  { value: 'va', label: 'VA' },
]

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

export default function TaskCreatePage() {
  const router = useRouter()

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create task')
      }
      router.push('/tasks')
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to create task')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[800px] mx-auto">
      <Breadcrumbs items={[{ label: 'Tasks', href: '/tasks' }, { label: 'Create New Task' }]} />

      <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        Create New Task
      </h1>

      <GlassCard className="p-5">
        <GlassForm onSubmit={handleCreate} submitLabel="Create Task">
          <Field label="Title" name="title" required placeholder="Task title" />
          <TextArea label="Description" name="description" placeholder="What needs to be done?" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Type" name="type" options={TYPE_OPTIONS} required />
            <Select label="Kanban Status" name="kanban_status" options={STATUS_OPTIONS} defaultValue="backlog" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Quadrant" name="quadrant" options={QUADRANT_OPTIONS} />
            <Select label="Priority" name="priority" options={PRIORITY_OPTIONS} defaultValue="medium" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Project ID" name="project_id" placeholder="Project UUID" />
            <Field label="Agent ID" name="agent_id" placeholder="Agent UUID" />
          </div>
          <Field
            label="Acceptance Criteria"
            name="acceptance_criteria"
            placeholder="Comma-separated criteria"
            dataType="array"
            description="Enter as comma-separated values"
          />
          <Field
            label="Estimated Minutes"
            name="estimated_minutes"
            type="number"
            dataType="number"
            placeholder="e.g. 60"
          />
        </GlassForm>
      </GlassCard>
    </div>
  )
}
