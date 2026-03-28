import { NotionClient } from '@/lib/notion/client'
import type { NotionPage } from '@/lib/notion/client'
import type {
  Task,
  BlogPost,
  VATask,
  NotionSyncDirection,
} from '@/lib/types'

// ---------------------------------------------------------------------------
// Local sync state tracking
// ---------------------------------------------------------------------------

interface NotionSyncState {
  entity_id: string
  entity_type: 'task' | 'blog_post' | 'va_task'
  notion_page_id: string
  last_synced_at: string
  direction: NotionSyncDirection
}

interface SyncConflict {
  entity_id: string
  entity_type: string
  local_updated_at: string
  remote_updated_at: string
  local_data: Record<string, unknown>
  remote_data: Record<string, unknown>
  resolution: 'local_wins' | 'remote_wins' | 'manual' | null
}

// ---------------------------------------------------------------------------
// Entity Mappers: Local -> Notion
// ---------------------------------------------------------------------------

export function taskToNotionPage(task: Task): Record<string, unknown> {
  return {
    Name: { title: [{ text: { content: task.title } }] },
    Status: { select: { name: task.kanban_status } },
    Priority: { select: { name: task.priority } },
    Description: {
      rich_text: [{ text: { content: task.description ?? '' } }],
    },
    Type: { select: { name: task.type } },
    'Agent ID': {
      rich_text: [{ text: { content: task.agent_id ?? '' } }],
    },
    'Created At': { date: { start: task.created_at } },
    'Updated At': { date: { start: task.updated_at } },
  }
}

export function notionPageToTask(page: NotionPage): Partial<Task> {
  const props = page.properties as Record<string, Record<string, unknown>>

  return {
    title: extractTitle(props['Name']),
    kanban_status: extractSelect(props['Status']) as Task['kanban_status'],
    priority: extractSelect(props['Priority']) as Task['priority'],
    description: extractRichText(props['Description']),
    type: extractSelect(props['Type']) as Task['type'],
    agent_id: extractRichText(props['Agent ID']) || null,
    notion_task_id: page.id,
    notion_last_synced_at: new Date().toISOString(),
  }
}

export function blogPostToNotionPage(post: BlogPost): Record<string, unknown> {
  return {
    Name: { title: [{ text: { content: post.title } }] },
    Slug: { rich_text: [{ text: { content: post.slug } }] },
    Status: { select: { name: post.status } },
    'Target Keyword': {
      rich_text: [{ text: { content: post.target_keyword ?? '' } }],
    },
    'Word Count': { number: post.word_count },
    Content: {
      rich_text: [
        {
          text: {
            content: (post.content ?? '').slice(0, 2000),
          },
        },
      ],
    },
    'Published At': post.published_at
      ? { date: { start: post.published_at } }
      : { date: null },
    'Created At': { date: { start: post.created_at } },
  }
}

export function vaTaskToNotionPage(vaTask: VATask): Record<string, unknown> {
  return {
    Name: { title: [{ text: { content: vaTask.title } }] },
    Description: {
      rich_text: [{ text: { content: vaTask.description ?? '' } }],
    },
    Status: { select: { name: vaTask.status } },
    Priority: { select: { name: vaTask.priority } },
    'Assigned To': {
      rich_text: [{ text: { content: vaTask.assigned_to ?? '' } }],
    },
    'Due Date': vaTask.due_date
      ? { date: { start: vaTask.due_date } }
      : { date: null },
    'Created At': { date: { start: vaTask.created_at } },
  }
}

// ---------------------------------------------------------------------------
// Notion Property Extractors
// ---------------------------------------------------------------------------

function extractTitle(prop: Record<string, unknown> | undefined): string {
  if (!prop) return ''
  const titleArr = prop.title as Array<{ plain_text?: string }> | undefined
  return titleArr?.[0]?.plain_text ?? ''
}

function extractRichText(prop: Record<string, unknown> | undefined): string {
  if (!prop) return ''
  const rtArr = prop.rich_text as Array<{ plain_text?: string }> | undefined
  return rtArr?.[0]?.plain_text ?? ''
}

function extractSelect(prop: Record<string, unknown> | undefined): string {
  if (!prop) return ''
  const select = prop.select as { name?: string } | null
  return select?.name ?? ''
}

// ---------------------------------------------------------------------------
// Sync Operations
// ---------------------------------------------------------------------------

interface SyncResult {
  synced: number
  skipped: number
  errors: Array<{ entity_id: string; error: string }>
}

export async function pushToNotion(
  client: NotionClient,
  databaseId: string,
  entities: Array<{
    id: string
    notion_page_id: string | null
    data: Record<string, unknown>
  }>
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] }

  for (const entity of entities) {
    try {
      if (entity.notion_page_id) {
        await client.updatePage(entity.notion_page_id, entity.data)
      } else {
        await client.createPage(databaseId, entity.data)
      }
      result.synced++
    } catch (err) {
      result.errors.push({
        entity_id: entity.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return result
}

export async function pullFromNotion(
  client: NotionClient,
  databaseId: string,
  lastSyncedAt: string | null
): Promise<NotionPage[]> {
  const pages: NotionPage[] = []
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const options: Record<string, unknown> = {
      page_size: 100,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    }

    if (lastSyncedAt) {
      options.filter = {
        timestamp: 'last_edited_time',
        last_edited_time: { on_or_after: lastSyncedAt },
      }
    }

    if (cursor) {
      options.start_cursor = cursor
    }

    const response = await client.queryDatabase(
      databaseId,
      options as Parameters<NotionClient['queryDatabase']>[1]
    )
    const resultPages = response.results as unknown as NotionPage[]
    pages.push(...resultPages)
    hasMore = response.has_more
    cursor = response.next_cursor ?? undefined
  }

  return pages
}

export async function fullSync(
  client: NotionClient,
  databaseId: string,
  localEntities: Array<{
    id: string
    notion_page_id: string | null
    updated_at: string
    data: Record<string, unknown>
  }>,
  syncStates: NotionSyncState[]
): Promise<{
  pushed: SyncResult
  pulled: NotionPage[]
  conflicts: SyncConflict[]
}> {
  // Build lookup of existing sync states
  const stateMap = new Map(syncStates.map((s) => [s.entity_id, s]))

  // Detect conflicts first
  const conflicts = await detectConflicts(client, localEntities, stateMap)

  // Filter out conflicted entities for push
  const conflictIds = new Set(conflicts.map((c) => c.entity_id))
  const pushable = localEntities.filter((e) => !conflictIds.has(e.id))

  // Find the oldest sync timestamp for pull
  const oldestSync = syncStates.reduce<string | null>((oldest, s) => {
    if (!oldest) return s.last_synced_at
    return s.last_synced_at < oldest ? s.last_synced_at : oldest
  }, null)

  const [pushed, pulled] = await Promise.all([
    pushToNotion(client, databaseId, pushable),
    pullFromNotion(client, databaseId, oldestSync),
  ])

  return { pushed, pulled, conflicts }
}

// ---------------------------------------------------------------------------
// Conflict Detection & Resolution
// ---------------------------------------------------------------------------

export async function detectConflicts(
  client: NotionClient,
  localEntities: Array<{
    id: string
    notion_page_id: string | null
    updated_at: string
    data: Record<string, unknown>
  }>,
  syncStates: Map<string, NotionSyncState>
): Promise<SyncConflict[]> {
  const conflicts: SyncConflict[] = []

  for (const entity of localEntities) {
    const state = syncStates.get(entity.id)
    if (!state || !entity.notion_page_id) continue

    // Only check entities that have been synced before
    const localModifiedAfterSync = entity.updated_at > state.last_synced_at

    if (!localModifiedAfterSync) continue

    try {
      const remotePage = await client.getPage(entity.notion_page_id)
      const remoteModifiedAfterSync =
        remotePage.last_edited_time > state.last_synced_at

      if (remoteModifiedAfterSync) {
        conflicts.push({
          entity_id: entity.id,
          entity_type: state.entity_type,
          local_updated_at: entity.updated_at,
          remote_updated_at: remotePage.last_edited_time,
          local_data: entity.data,
          remote_data: remotePage.properties as Record<string, unknown>,
          resolution: null,
        })
      }
    } catch {
      // If we can't fetch the remote page, skip conflict detection for it
    }
  }

  return conflicts
}

export function resolveConflict(
  conflict: SyncConflict,
  resolution: 'local_wins' | 'remote_wins' | 'manual'
): { data: Record<string, unknown>; source: 'local' | 'remote' } {
  switch (resolution) {
    case 'local_wins':
      return { data: conflict.local_data, source: 'local' }
    case 'remote_wins':
      return { data: conflict.remote_data, source: 'remote' }
    case 'manual':
      // For manual resolution, return local data as a starting point
      // The caller is expected to present both versions for human review
      return { data: conflict.local_data, source: 'local' }
    default: {
      const _exhaustive: never = resolution
      throw new Error(`Unknown conflict resolution strategy: ${_exhaustive}`)
    }
  }
}
