import {
  readCLAUDEMD,
  readTasksJSON,
  readAgentsJSON,
  readInboxJSON,
  readActivityLogJSON,
} from '@/lib/cowork/filesystem'
import type {
  Task,
  Agent,
  InboxMessage,
  ActivityLogEntry,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Context Builder - aggregates workspace state into a compact AI prompt string
// ---------------------------------------------------------------------------

export async function buildContext(): Promise<string> {
  const [claudeMd, tasks, agents, inbox, activity] = await Promise.all([
    readCLAUDEMD(),
    readTasksJSON(),
    readAgentsJSON(),
    readInboxJSON(),
    readActivityLogJSON(),
  ])

  const sections: string[] = [
    formatProjectContext(claudeMd),
    formatAgentContext(agents),
    formatTaskContext(tasks),
    formatInboxContext(inbox),
    formatActivityContext(activity.slice(-15)),
  ]

  return sections.filter(Boolean).join('\n\n')
}

// ---------------------------------------------------------------------------
// Section Formatters
// ---------------------------------------------------------------------------

export function formatProjectContext(claudeMd: string): string {
  if (!claudeMd.trim()) {
    return '[PROJECT]\nNo project context available.'
  }

  // Extract key sections: first heading + first 2 paragraphs
  const lines = claudeMd.split('\n')
  const heading = lines.find((l) => l.startsWith('#')) ?? 'Unknown Project'
  const paragraphs = lines
    .filter((l) => l.trim().length > 0 && !l.startsWith('#'))
    .slice(0, 3)
    .join(' ')

  const summary =
    paragraphs.length > 300 ? paragraphs.slice(0, 297) + '...' : paragraphs

  return `[PROJECT]\n${heading}\n${summary}`
}

export function formatAgentContext(agents: Agent[]): string {
  if (agents.length === 0) {
    return '[AGENTS]\nNo agents registered.'
  }

  const active = agents.filter(
    (a) => a.status === 'running' || a.status === 'idle'
  )
  const offline = agents.filter((a) => a.status === 'offline')
  const errored = agents.filter((a) => a.status === 'error')

  const agentLines = agents.map((a) => {
    const caps =
      a.capabilities && a.capabilities.length > 0
        ? a.capabilities.join(', ')
        : 'none'
    return `  - ${a.name} (${a.role}) [${a.status}] caps: ${caps}`
  })

  return [
    `[AGENTS] ${active.length} active, ${offline.length} offline, ${errored.length} errored`,
    ...agentLines,
  ].join('\n')
}

export function formatTaskContext(tasks: Task[]): string {
  if (tasks.length === 0) {
    return '[TASKS]\nNo tasks.'
  }

  const byStatus: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!byStatus[task.kanban_status]) byStatus[task.kanban_status] = []
    byStatus[task.kanban_status].push(task)
  }

  const statusCounts = Object.entries(byStatus)
    .map(([status, items]) => `${status}=${items.length}`)
    .join(' ')

  // Show active tasks with detail, just counts for rest
  const activeTasks = [
    ...(byStatus['in_progress'] ?? []),
    ...(byStatus['planned'] ?? []),
    ...(byStatus['backlog'] ?? []),
  ]

  const taskLines = activeTasks.slice(0, 8).map((t) => {
    const assignee = t.agent_id ? ` -> ${t.agent_id}` : ''
    return `  - [${t.priority}] ${t.title} (${t.kanban_status})${assignee}`
  })

  const overflow =
    activeTasks.length > 8
      ? `\n  ... and ${activeTasks.length - 8} more active`
      : ''

  return [`[TASKS] ${statusCounts}`, ...taskLines, overflow]
    .filter(Boolean)
    .join('\n')
}

function formatInboxContext(inbox: InboxMessage[]): string {
  const unread = inbox.filter((m) => m.status === 'unread')
  const actionable = unread.filter((m) => m.requires_action)

  if (unread.length === 0) {
    return '[INBOX] Empty'
  }

  const messageLines = unread.slice(0, 5).map((m) => {
    const tag = m.requires_action ? ' [ACTION NEEDED]' : ''
    return `  - From ${m.from_agent_id ?? 'system'}: ${m.subject}${tag}`
  })

  const overflow =
    unread.length > 5 ? `\n  ... and ${unread.length - 5} more unread` : ''

  return [
    `[INBOX] ${unread.length} unread, ${actionable.length} actions pending`,
    ...messageLines,
    overflow,
  ]
    .filter(Boolean)
    .join('\n')
}

function formatActivityContext(activity: ActivityLogEntry[]): string {
  if (activity.length === 0) {
    return '[ACTIVITY] No recent activity.'
  }

  const activityLines = activity.map((a) => {
    const time = new Date(a.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `  ${time} ${a.event_type}: ${a.description}`
  })

  return [`[ACTIVITY] Last ${activity.length} events`, ...activityLines].join(
    '\n'
  )
}
