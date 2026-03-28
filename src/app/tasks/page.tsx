'use client'

import { useState, useCallback } from 'react'
import { useTasks, useProjects, useAgents } from '@/lib/hooks/use-data'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayoutGrid, Columns3, Plus, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import AgentAvatar from '@/components/ui/AgentAvatar'
import type { Task, KanbanStatus, Quadrant } from '@/lib/types'

const KANBAN_COLUMNS: { id: KanbanStatus; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'planned', label: 'Planned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'review', label: 'Review' },
  { id: 'testing', label: 'Testing' },
  { id: 'done', label: 'Done' },
]

const QUADRANTS: {
  id: Quadrant
  label: string
  subtitle: string
  color: string
  bg: string
}[] = [
  {
    id: 'do',
    label: 'DO',
    subtitle: 'Important & Urgent',
    color: 'var(--accent-rose)',
    bg: 'rgba(244,63,94,0.06)',
  },
  {
    id: 'schedule',
    label: 'SCHEDULE',
    subtitle: 'Important & Not Urgent',
    color: 'var(--accent-blue)',
    bg: 'rgba(59,130,246,0.06)',
  },
  {
    id: 'delegate',
    label: 'DELEGATE',
    subtitle: 'Not Important & Urgent',
    color: 'var(--accent-amber)',
    bg: 'rgba(245,158,11,0.06)',
  },
  {
    id: 'eliminate',
    label: 'ELIMINATE',
    subtitle: 'Not Important & Not Urgent',
    color: 'var(--text-muted)',
    bg: 'rgba(255,255,255,0.02)',
  },
]

function TaskCard({ task, isDragging }: { task: Task; isDragging?: boolean }) {
  const agents = useStore((s) => s.agents)
  const projects = useStore((s) => s.projects)
  const agent = agents.find((a) => a.id === task.agent_id)
  const project = projects.find((p) => p.id === task.project_id)

  const priorityColors: Record<string, string> = {
    critical: 'var(--accent-rose)',
    high: 'var(--accent-amber)',
    medium: 'var(--accent-blue)',
    low: 'var(--text-muted)',
  }

  return (
    <div
      className="p-3 rounded-xl space-y-2"
      style={{
        background: isDragging ? 'var(--glass-bg-active)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isDragging ? 'var(--glass-border-strong)' : 'rgba(255,255,255,0.06)'}`,
        opacity: isDragging ? 0.9 : 1,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
          {task.title}
        </p>
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ background: priorityColors[task.priority] }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {project && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{
                background: `${project.color ?? '#3b82f6'}22`,
                color: project.color ?? '#3b82f6',
              }}
            >
              {project.name}
            </span>
          )}
        </div>
        {agent && (
          <AgentAvatar name={agent.name} role={agent.role} status={agent.status} size="sm" />
        )}
      </div>
      {task.total_cost_usd > 0 && (
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          ${task.total_cost_usd.toFixed(4)}
        </p>
      )}
    </div>
  )
}

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  )
}

function KanbanColumn({
  column,
  tasks,
}: {
  column: { id: KanbanStatus; label: string }
  tasks: Task[]
}) {
  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {column.label}
        </h3>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
        >
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          className="flex-1 space-y-2 p-2 rounded-xl min-h-[200px]"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function KanbanView() {
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id)
      if (task) setActiveTask(task)
    },
    [tasks]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over) return

      const taskId = active.id as string
      const overTask = tasks.find((t) => t.id === over.id)
      if (overTask && overTask.kanban_status) {
        updateTask(taskId, { kanban_status: overTask.kanban_status })
      }
    },
    [tasks, updateTask]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((t) => t.kanban_status === col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function EisenhowerView() {
  const tasks = useStore((s) => s.tasks)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {QUADRANTS.map((q) => {
        const quadrantTasks = tasks.filter((t) => t.quadrant === q.id)
        return (
          <GlassCard key={q.id} className="p-5 min-h-[280px]" hover={false}>
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: q.bg }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold tracking-wider" style={{ color: q.color }}>
                  {q.label}
                </h3>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {q.subtitle}
                </span>
              </div>
              <div className="space-y-2">
                {quadrantTasks.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No tasks in this quadrant
                  </p>
                ) : (
                  quadrantTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

function BrainDump() {
  const [text, setText] = useState('')
  const [isTriaging, setIsTriaging] = useState(false)

  const handleTriage = async () => {
    if (!text.trim()) return
    setIsTriaging(true)
    // AI triage would be called here
    setTimeout(() => setIsTriaging(false), 2000)
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
        Brain Dump
      </h3>
      <textarea
        className="glass-input w-full h-24 resize-none text-sm"
        placeholder="Dump your thoughts here... then click Triage to let AI categorize them into tasks."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end mt-3 gap-2">
        <button
          className="glass-button-primary glass-button flex items-center gap-2 text-sm"
          onClick={handleTriage}
          disabled={isTriaging || !text.trim()}
        >
          <Sparkles size={14} />
          {isTriaging ? 'Triaging...' : 'Triage'}
        </button>
      </div>
    </GlassCard>
  )
}

export default function TasksPage() {
  useTasks()
  useProjects()
  useAgents()
  const [view, setView] = useState<'kanban' | 'eisenhower'>('kanban')

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className={`glass-button text-sm flex items-center gap-2 ${view === 'kanban' ? 'glass-button-primary' : ''}`}
            onClick={() => setView('kanban')}
          >
            <Columns3 size={14} />
            Kanban
          </button>
          <button
            className={`glass-button text-sm flex items-center gap-2 ${view === 'eisenhower' ? 'glass-button-primary' : ''}`}
            onClick={() => setView('eisenhower')}
          >
            <LayoutGrid size={14} />
            Eisenhower
          </button>
        </div>
        <button className="glass-button-primary glass-button text-sm flex items-center gap-2">
          <Plus size={14} />
          New Task
        </button>
      </div>

      {/* View */}
      {view === 'kanban' ? <KanbanView /> : <EisenhowerView />}

      {/* Brain Dump */}
      <BrainDump />
    </div>
  )
}
