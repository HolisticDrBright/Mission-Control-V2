'use client'

import { use } from 'react'
import { useState } from 'react'
import { useProjects, useTasks, useAgents } from '@/lib/hooks/use-data'
import { ArrowLeft, Bot, FolderKanban, DollarSign, Clock } from 'lucide-react'
import Link from 'next/link'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import AgentAvatar from '@/components/ui/AgentAvatar'

type Params = Promise<{ slug: string }>

const TABS = ['Overview', 'Tasks', 'Agents', 'Runs'] as const

export default function ProjectDetailPage({ params }: { params: Params }) {
  useProjects()
  useTasks()
  useAgents()
  const { slug } = use(params)
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const agents = useStore((s) => s.agents)
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>('Overview')

  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <div className="p-6">
        <p style={{ color: 'var(--text-muted)' }}>Project not found.</p>
      </div>
    )
  }

  const projectTasks = tasks.filter((t) => t.project_id === project.id)
  const projectAgents = agents.filter((a) => a.project_id === project.id)
  const totalCost = projectTasks.reduce((sum, t) => sum + (t.total_cost_usd || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/projects"
          className="text-xs flex items-center gap-1 mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={12} />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{project.icon}</span>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
            )}
          </div>
          <StatusPill status={project.status} size="md" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <FolderKanban size={14} />
            {projectTasks.length} tasks
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Bot size={14} />
            {projectAgents.length} agents
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <DollarSign size={14} />
            ${totalCost.toFixed(2)} spent
          </div>
        </div>

        {/* Agent Avatars */}
        {projectAgents.length > 0 && (
          <div className="flex -space-x-2 mt-3">
            {projectAgents.map((a) => (
              <AgentAvatar key={a.id} name={a.name} role={a.role} status={a.status} size="md" />
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            className="px-4 py-1.5 rounded-lg text-sm transition-all"
            style={{
              background: activeTab === tab ? 'var(--glass-bg-hover)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Active Tasks
            </h3>
            <div className="space-y-2">
              {projectTasks
                .filter((t) => t.kanban_status !== 'done' && t.kanban_status !== 'backlog')
                .slice(0, 8)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {task.title}
                    </span>
                    <StatusPill status={task.kanban_status} size="sm" />
                  </div>
                ))}
              {projectTasks.filter(
                (t) => t.kanban_status !== 'done' && t.kanban_status !== 'backlog'
              ).length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No active tasks
                </p>
              )}
            </div>
          </GlassCard>
          <GlassCard className="p-5">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Assigned Agents
            </h3>
            <div className="space-y-2">
              {projectAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <AgentAvatar
                    name={agent.name}
                    role={agent.role}
                    status={agent.status}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {agent.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {agent.role}
                    </p>
                  </div>
                  <StatusPill status={agent.status} size="sm" />
                </div>
              ))}
              {projectAgents.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No agents assigned
                </p>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'Tasks' && (
        <div className="space-y-2">
          {projectTasks.map((task) => (
            <GlassCard key={task.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {task.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {task.type} · Priority: {task.priority}
                </p>
              </div>
              <StatusPill status={task.kanban_status} size="sm" />
            </GlassCard>
          ))}
          {projectTasks.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No tasks for this project
            </p>
          )}
        </div>
      )}

      {activeTab === 'Agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectAgents.map((agent) => (
            <GlassCard key={agent.id} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <AgentAvatar
                  name={agent.name}
                  role={agent.role}
                  status={agent.status}
                  size="md"
                />
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {agent.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {agent.model}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{agent.total_runs} runs</span>
                <span>${(agent.total_cost_usd || 0).toFixed(4)}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {activeTab === 'Runs' && (
        <GlassCard className="p-5">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Run history will appear here as agents complete tasks.
          </p>
        </GlassCard>
      )}
    </div>
  )
}
