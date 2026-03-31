'use client'

import { useState } from 'react'
import { useProjects, useTasks, useAgents } from '@/lib/hooks/use-data'
import Link from 'next/link'
import { Plus, FolderKanban, Bot, Clock } from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'
import AgentAvatar from '@/components/ui/AgentAvatar'

const TYPE_BADGES: Record<string, { label: string; color: string }> = {
  app_dev: { label: 'App Dev', color: 'var(--accent-blue)' },
  seo: { label: 'SEO', color: 'var(--accent-emerald)' },
  ugc: { label: 'UGC', color: 'var(--accent-rose)' },
  general: { label: 'General', color: 'var(--accent-purple)' },
  va: { label: 'VA', color: 'var(--accent-amber)' },
}

export default function ProjectsPage() {
  useProjects()
  useTasks()
  useAgents()
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const agents = useStore((s) => s.agents)

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Projects
        </h2>
        <Link href="/projects/new" className="glass-button-primary glass-button text-sm flex items-center gap-2">
          <Plus size={14} />
          Create Project
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.length === 0 ? (
          <GlassCard className="p-8 col-span-full flex flex-col items-center justify-center">
            <FolderKanban size={40} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
              No projects yet. Create your first project to get started.
            </p>
          </GlassCard>
        ) : (
          projects.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id)
            const activeTasks = projectTasks.filter(
              (t) => t.kanban_status === 'in_progress'
            ).length
            const projectAgents = agents.filter((a) => a.project_id === project.id)
            const badge = TYPE_BADGES[project.type] || TYPE_BADGES.general

            return (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <GlassCard className="p-5 cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{project.icon}</span>
                      <h3
                        className="text-base font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {project.name}
                      </h3>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ background: `${badge.color}22`, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {project.description && (
                    <p
                      className="text-sm mb-4 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban size={13} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {activeTasks} active
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bot size={13} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {projectAgents.length}
                        </span>
                      </div>
                    </div>
                    <StatusPill status={project.status} size="sm" />
                  </div>

                  {projectAgents.length > 0 && (
                    <div className="flex -space-x-2 mt-3">
                      {projectAgents.slice(0, 4).map((a) => (
                        <AgentAvatar
                          key={a.id}
                          name={a.name}
                          role={a.role}
                          status={a.status}
                          size="sm"
                        />
                      ))}
                      {projectAgents.length > 4 && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          +{projectAgents.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
