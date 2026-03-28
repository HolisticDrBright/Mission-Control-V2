import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type {
  Task,
  Agent,
  InboxMessage,
  InboxMessageCreateInput,
  ActivityLogEntry,
  KanbanStatus,
} from '@/lib/types'

const COWORK_ROOT = process.env.COWORK_ROOT ?? join(process.cwd(), '.cowork')

function filePath(filename: string): string {
  return join(COWORK_ROOT, filename)
}

async function readJsonFile<T>(filename: string): Promise<T> {
  try {
    const raw = await readFile(filePath(filename), 'utf-8')
    return JSON.parse(raw) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return (Array.isArray([] as unknown as T) ? [] : {}) as T
    }
    throw new Error(
      `Failed to read ${filename}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await writeFile(filePath(filename), JSON.stringify(data, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

export async function readCLAUDEMD(): Promise<string> {
  try {
    return await readFile(filePath('CLAUDE.md'), 'utf-8')
  } catch {
    return ''
  }
}

export async function readTasksJSON(): Promise<Task[]> {
  return readJsonFile<Task[]>('tasks.json')
}

export async function readAgentsJSON(): Promise<Agent[]> {
  return readJsonFile<Agent[]>('agents.json')
}

export async function readInboxJSON(): Promise<InboxMessage[]> {
  return readJsonFile<InboxMessage[]>('inbox.json')
}

export async function readActivityLogJSON(): Promise<ActivityLogEntry[]> {
  return readJsonFile<ActivityLogEntry[]>('activity_log.json')
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

export async function updateTaskStatus(
  taskId: string,
  status: KanbanStatus
): Promise<Task | null> {
  const tasks = await readTasksJSON()
  const taskIndex = tasks.findIndex((t: Task) => t.id === taskId)

  if (taskIndex === -1) {
    return null
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    kanban_status: status,
    updated_at: new Date().toISOString(),
  }

  await writeJsonFile('tasks.json', tasks)
  return tasks[taskIndex]
}

export async function postInboxMessage(
  message: InboxMessageCreateInput
): Promise<InboxMessage> {
  const inbox = await readInboxJSON()

  const newMessage: InboxMessage = {
    ...message,
    id: crypto.randomUUID(),
    status: 'unread',
    action_taken: null,
    actioned_at: null,
    notion_synced: false,
    created_at: new Date().toISOString(),
  }

  inbox.push(newMessage)
  await writeJsonFile('inbox.json', inbox)
  return newMessage
}

export async function logActivity(
  entry: Omit<ActivityLogEntry, 'id' | 'created_at'>
): Promise<ActivityLogEntry> {
  const log = await readActivityLogJSON()

  const newEntry: ActivityLogEntry = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }

  log.push(newEntry)

  // Keep only last 500 entries to prevent unbounded growth
  const trimmed = log.slice(-500)
  await writeJsonFile('activity_log.json', trimmed)
  return newEntry
}

// ---------------------------------------------------------------------------
// AI Context Generator (~650 tokens)
// ---------------------------------------------------------------------------

export interface WorkspaceSnapshot {
  project_summary: string
  agents: Agent[]
  tasks: Task[]
  inbox: InboxMessage[]
  recent_activity: ActivityLogEntry[]
}

export async function generateAIContext(): Promise<string> {
  const [claudeMd, tasks, agents, inbox, activityLog] = await Promise.all([
    readCLAUDEMD(),
    readTasksJSON(),
    readAgentsJSON(),
    readInboxJSON(),
    readActivityLogJSON(),
  ])

  const context: WorkspaceSnapshot = {
    project_summary: extractProjectSummary(claudeMd),
    agents,
    tasks,
    inbox,
    recent_activity: activityLog.slice(-20),
  }

  const activeTasks = context.tasks.filter(
    (t: Task) =>
      t.kanban_status === 'in_progress' ||
      t.kanban_status === 'planned' ||
      t.kanban_status === 'backlog'
  )
  const completedCount = context.tasks.filter(
    (t: Task) => t.kanban_status === 'done'
  ).length
  const failedCount = context.tasks.filter(
    (t: Task) => t.kanban_status === 'blocked'
  ).length
  const unreadInbox = context.inbox.filter(
    (m: InboxMessage) => m.status === 'unread'
  )
  const approvalNeeded = context.inbox.filter(
    (m: InboxMessage) => m.requires_action && m.status === 'unread'
  )

  const lines: string[] = [
    '=== WORKSPACE SNAPSHOT ===',
    '',
    `Project: ${context.project_summary}`,
    '',
    `--- Agents (${context.agents.length}) ---`,
    ...context.agents.map(
      (a: Agent) =>
        `  ${a.name} [${a.status}] role=${a.role} caps=${(a.capabilities ?? []).join(',')}`
    ),
    '',
    `--- Tasks: ${activeTasks.length} active, ${completedCount} done, ${failedCount} blocked ---`,
    ...activeTasks.slice(0, 10).map(
      (t: Task) =>
        `  [${t.priority}] ${t.title} (${t.kanban_status}) -> ${t.agent_id ?? 'unassigned'}`
    ),
    '',
    `--- Inbox: ${unreadInbox.length} unread, ${approvalNeeded.length} need action ---`,
    ...unreadInbox.slice(0, 5).map(
      (m: InboxMessage) =>
        `  From ${m.from_agent_id ?? 'system'}: ${m.subject}${m.requires_action ? ' [ACTION]' : ''}`
    ),
    '',
    `--- Recent Activity (last ${Math.min(context.recent_activity.length, 10)}) ---`,
    ...context.recent_activity.slice(-10).map(
      (a: ActivityLogEntry) => `  ${a.event_type}: ${a.description}`
    ),
    '',
    '=== END SNAPSHOT ===',
  ]

  return lines.join('\n')
}

function extractProjectSummary(claudeMd: string): string {
  if (!claudeMd) return 'No CLAUDE.md found'

  // Take the first meaningful paragraph (up to 200 chars)
  const lines = claudeMd.split('\n').filter((l: string) => l.trim().length > 0)
  const summary = lines.slice(0, 3).join(' ').trim()
  return summary.length > 200 ? summary.slice(0, 197) + '...' : summary
}
