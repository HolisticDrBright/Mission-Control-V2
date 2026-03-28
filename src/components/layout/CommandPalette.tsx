'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import * as Dialog from '@radix-ui/react-dialog'
import {
  CheckSquare,
  FolderKanban,
  Bot,
  Search,
  LayoutDashboard,
  Calendar,
  Mail,
  Video,
  Leaf,
  Zap,
  Users,
  Brain,
  RefreshCw,
  Settings,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

// ---------------------------------------------------------------------------
// Navigation pages for search
// ---------------------------------------------------------------------------

const PAGES = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Overview & metrics' },
  { label: 'Projects', href: '/projects', icon: FolderKanban, description: 'All projects' },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare, description: 'Task board & Kanban' },
  { label: 'Agents', href: '/agents', icon: Bot, description: 'AI agent management' },
  { label: 'Scheduler', href: '/scheduler', icon: Calendar, description: 'Scheduled jobs' },
  { label: 'Inbox', href: '/inbox', icon: Mail, description: 'Messages & approvals' },
  { label: 'Viral Reel', href: '/viral-reel', icon: Video, description: 'Video content pipeline' },
  { label: 'HolisticDrBright SEO', href: '/holistic-seo', icon: Leaf, description: 'SEO dashboard' },
  { label: 'DSpiked SEO', href: '/dspiked-seo', icon: Zap, description: 'SEO dashboard' },
  { label: 'VA Tasks', href: '/va-tasks', icon: Users, description: 'Virtual assistant tasks' },
  { label: 'ML Ops', href: '/ml-ops', icon: Brain, description: 'Machine learning operations' },
  { label: 'Notion Sync', href: '/notion-sync', icon: RefreshCw, description: 'Sync with Notion' },
  { label: 'Settings', href: '/settings', icon: Settings, description: 'System settings' },
]

const SUGGESTED = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Agents', href: '/agents', icon: Bot },
]

// ---------------------------------------------------------------------------
// CommandPalette component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const router = useRouter()
  const open = useStore((s) => s.commandPaletteOpen)
  const toggle = useStore((s) => s.toggleCommandPalette)
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const agents = useStore((s) => s.agents)
  const [search, setSearch] = useState('')

  // ---- Keyboard shortcut: Cmd+K / Ctrl+K ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  // Reset search when closing
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const navigate = useCallback(
    (href: string) => {
      toggle()
      router.push(href)
    },
    [router, toggle],
  )

  const hasSearch = search.trim().length > 0

  return (
    <Dialog.Root open={open} onOpenChange={toggle}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className="fixed inset-0 z-[100]"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        />

        {/* Content wrapper */}
        <Dialog.Content
          className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div
            className={cn(
              'w-full max-w-[560px] overflow-hidden rounded-2xl',
              'animate-in fade-in zoom-in-[0.97] duration-150',
            )}
            style={{
              background: 'rgba(12, 16, 28, 0.85)',
              backdropFilter: 'blur(40px) saturate(200%)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              boxShadow:
                '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
          >
            <Command label="Global search" loop>
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4 border-b"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <Search
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search tasks, projects, agents, pages..."
                  className={cn(
                    'flex-1 bg-transparent border-none outline-none py-3.5 text-sm',
                    'placeholder:text-[var(--text-muted)]',
                  )}
                  style={{ color: 'var(--text-primary)' }}
                />
                <kbd
                  className="hidden sm:inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-muted)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results list */}
              <Command.List
                className="overflow-y-auto py-2 px-2"
                style={{ maxHeight: '360px' }}
              >
                <Command.Empty className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No results found.
                </Command.Empty>

                {/* ---- Suggested (when search is empty) ---- */}
                {!hasSearch && (
                  <Command.Group
                    heading={
                      <span
                        className="text-[10px] uppercase tracking-widest px-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Suggested
                      </span>
                    }
                  >
                    {SUGGESTED.map((item) => {
                      const Icon = item.icon
                      return (
                        <Command.Item
                          key={item.href}
                          value={item.label}
                          onSelect={() => navigate(item.href)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                            'transition-colors duration-100',
                            'data-[selected=true]:bg-[var(--glass-bg-active)]',
                          )}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-blue)' }} />
                          <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                          <ArrowRight
                            className="w-3 h-3 ml-auto opacity-0 data-[selected=true]:opacity-100 transition-opacity"
                            style={{ color: 'var(--text-muted)' }}
                          />
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )}

                {/* ---- Recent pages (when search is empty) ---- */}
                {!hasSearch && (
                  <Command.Group
                    heading={
                      <span
                        className="text-[10px] uppercase tracking-widest px-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Quick Navigation
                      </span>
                    }
                  >
                    {PAGES.filter((p) => !SUGGESTED.find((s) => s.href === p.href))
                      .slice(0, 5)
                      .map((page) => {
                        const Icon = page.icon
                        return (
                          <Command.Item
                            key={page.href}
                            value={page.label}
                            onSelect={() => navigate(page.href)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                              'transition-colors duration-100',
                              'data-[selected=true]:bg-[var(--glass-bg-active)]',
                            )}
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                                {page.label}
                              </span>
                              <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {page.description}
                              </span>
                            </div>
                            <kbd
                              className="ml-auto hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0"
                              style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                color: 'var(--text-muted)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              Enter
                            </kbd>
                          </Command.Item>
                        )
                      })}
                  </Command.Group>
                )}

                {/* ---- Tasks ---- */}
                {tasks.length > 0 && (
                  <Command.Group
                    heading={
                      <span
                        className="text-[10px] uppercase tracking-widest px-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Tasks
                      </span>
                    }
                  >
                    {tasks.map((task) => (
                      <Command.Item
                        key={task.id}
                        value={task.title}
                        keywords={[task.title, task.kanban_status, task.priority]}
                        onSelect={() => navigate(`/tasks?id=${task.id}`)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                          'transition-colors duration-100',
                          'data-[selected=true]:bg-[var(--glass-bg-active)]',
                        )}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <CheckSquare
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent-cyan)' }}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                            {task.title}
                          </span>
                          <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {task.kanban_status.replace(/_/g, ' ')} &middot; {task.priority}
                          </span>
                        </div>
                        <kbd
                          className="ml-auto hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0"
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          Enter
                        </kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* ---- Projects ---- */}
                {projects.length > 0 && (
                  <Command.Group
                    heading={
                      <span
                        className="text-[10px] uppercase tracking-widest px-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Projects
                      </span>
                    }
                  >
                    {projects.map((project) => (
                      <Command.Item
                        key={project.id}
                        value={project.name}
                        keywords={[project.name, project.type, project.status]}
                        onSelect={() => navigate(`/projects/${project.slug}`)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                          'transition-colors duration-100',
                          'data-[selected=true]:bg-[var(--glass-bg-active)]',
                        )}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <FolderKanban
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent-purple)' }}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                            {project.name}
                          </span>
                          <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {project.type} &middot; {project.status}
                          </span>
                        </div>
                        <kbd
                          className="ml-auto hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0"
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          Enter
                        </kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* ---- Agents ---- */}
                {agents.length > 0 && (
                  <Command.Group
                    heading={
                      <span
                        className="text-[10px] uppercase tracking-widest px-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Agents
                      </span>
                    }
                  >
                    {agents.map((agent) => (
                      <Command.Item
                        key={agent.id}
                        value={agent.name}
                        keywords={[agent.name, agent.role, agent.status]}
                        onSelect={() => navigate(`/agents?id=${agent.id}`)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                          'transition-colors duration-100',
                          'data-[selected=true]:bg-[var(--glass-bg-active)]',
                        )}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Bot
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent-emerald)' }}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                            {agent.name}
                          </span>
                          <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {agent.role} &middot; {agent.status}
                          </span>
                        </div>
                        <kbd
                          className="ml-auto hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0"
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          Enter
                        </kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* ---- Pages ---- */}
                {hasSearch && (
                  <Command.Group
                    heading={
                      <span
                        className="text-[10px] uppercase tracking-widest px-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Pages
                      </span>
                    }
                  >
                    {PAGES.map((page) => {
                      const Icon = page.icon
                      return (
                        <Command.Item
                          key={page.href}
                          value={`page-${page.label}`}
                          keywords={[page.label, page.description]}
                          onSelect={() => navigate(page.href)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer',
                            'transition-colors duration-100',
                            'data-[selected=true]:bg-[var(--glass-bg-active)]',
                          )}
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <FileText
                            className="w-4 h-4 shrink-0"
                            style={{ color: 'var(--text-secondary)' }}
                          />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate" style={{ color: 'var(--text-primary)' }}>
                              {page.label}
                            </span>
                            <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                              {page.description}
                            </span>
                          </div>
                          <kbd
                            className="ml-auto hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono shrink-0"
                            style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: 'var(--text-muted)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                          >
                            Enter
                          </kbd>
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div
                className="flex items-center gap-4 px-4 py-2.5 border-t text-[11px]"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="flex items-center gap-1.5">
                  <kbd
                    className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    &uarr;&darr;
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd
                    className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    &crarr;
                  </kbd>
                  Select
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd
                    className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    Esc
                  </kbd>
                  Close
                </span>
              </div>
            </Command>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
