const NOTION_API_VERSION = '2022-06-28'
const NOTION_BASE_URL = 'https://api.notion.com/v1'

// ---------------------------------------------------------------------------
// Notion API types
// ---------------------------------------------------------------------------

export interface NotionPage {
  id: string
  properties: Record<string, unknown>
  created_time: string
  last_edited_time: string
  archived: boolean
  url: string
}

export interface NotionDatabase {
  id: string
  title: Array<{ plain_text: string }>
  properties: Record<string, NotionPropertySchema>
}

export interface NotionPropertySchema {
  id: string
  name: string
  type: string
  [key: string]: unknown
}

interface NotionQueryFilter {
  property: string
  [key: string]: unknown
}

interface NotionQuerySort {
  property?: string
  timestamp?: 'created_time' | 'last_edited_time'
  direction: 'ascending' | 'descending'
}

interface NotionQueryOptions {
  filter?: NotionQueryFilter | { or?: NotionQueryFilter[]; and?: NotionQueryFilter[] }
  sorts?: NotionQuerySort[]
  start_cursor?: string
  page_size?: number
}

interface NotionQueryResult {
  results: NotionPage[]
  next_cursor: string | null
  has_more: boolean
}

export class NotionClient {
  private token: string

  constructor(token?: string) {
    this.token = token ?? process.env.NOTION_API_TOKEN ?? ''
    if (!this.token) {
      throw new Error(
        'Notion API token is required. Set NOTION_API_TOKEN env var or pass to constructor.'
      )
    }
  }

  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    const response = await this.request<NotionDatabase>(
      'GET',
      `/databases/${databaseId}`
    )
    return response
  }

  async queryDatabase(
    databaseId: string,
    options: NotionQueryOptions = {}
  ): Promise<NotionQueryResult> {
    const body: Record<string, unknown> = {}
    if (options.filter) body.filter = options.filter
    if (options.sorts) body.sorts = options.sorts
    if (options.start_cursor) body.start_cursor = options.start_cursor
    if (options.page_size) body.page_size = options.page_size

    const response = await this.request<NotionQueryResult>(
      'POST',
      `/databases/${databaseId}/query`,
      body
    )
    return response
  }

  async createPage(
    parentDatabaseId: string,
    properties: Record<string, unknown>,
    children?: Record<string, unknown>[]
  ): Promise<NotionPage> {
    const body: Record<string, unknown> = {
      parent: { database_id: parentDatabaseId },
      properties,
    }
    if (children && children.length > 0) {
      body.children = children
    }

    const response = await this.request<NotionPage>('POST', '/pages', body)
    return response
  }

  async updatePage(
    pageId: string,
    properties: Record<string, unknown>,
    archived?: boolean
  ): Promise<NotionPage> {
    const body: Record<string, unknown> = { properties }
    if (archived !== undefined) {
      body.archived = archived
    }

    const response = await this.request<NotionPage>(
      'PATCH',
      `/pages/${pageId}`,
      body
    )
    return response
  }

  async getPage(pageId: string): Promise<NotionPage> {
    const response = await this.request<NotionPage>('GET', `/pages/${pageId}`)
    return response
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP helper
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${NOTION_BASE_URL}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
    }

    const init: RequestInit = { method, headers }
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      init.body = JSON.stringify(body)
    }

    const response = await fetch(url, init)

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Notion API error ${response.status} ${method} ${path}: ${errorBody}`
      )
    }

    return (await response.json()) as T
  }
}
