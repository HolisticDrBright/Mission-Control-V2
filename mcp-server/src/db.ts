import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getDb(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return client
}

// Generic query helpers
export async function listRows(
  table: string,
  opts: {
    filters?: Record<string, string | number | boolean>
    order?: { column: string; ascending?: boolean }
    limit?: number
    offset?: number
    search?: { column: string; query: string }
  } = {},
) {
  const db = getDb()
  let q = db.from(table).select('*', { count: 'exact' })

  if (opts.filters) {
    for (const [col, val] of Object.entries(opts.filters)) {
      if (val !== undefined && val !== null && val !== '') {
        q = q.eq(col, val)
      }
    }
  }

  if (opts.search) {
    q = q.ilike(opts.search.column, `%${opts.search.query}%`)
  }

  if (opts.order) {
    q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false })
  }

  q = q.range(opts.offset || 0, (opts.offset || 0) + (opts.limit || 50) - 1)

  const { data, count, error } = await q

  if (error) throw new Error(`Query ${table}: ${error.message}`)
  return { data: data || [], total: count || 0 }
}

export async function getRow(table: string, id: string, idColumn = 'id') {
  const db = getDb()
  const { data, error } = await db.from(table).select('*').eq(idColumn, id).single()
  if (error) throw new Error(`Get ${table}/${id}: ${error.message}`)
  return data
}

export async function insertRow(table: string, row: Record<string, unknown>) {
  const db = getDb()
  const { data, error } = await db.from(table).insert(row).select().single()
  if (error) throw new Error(`Insert ${table}: ${error.message}`)
  return data
}

export async function updateRow(table: string, id: string, updates: Record<string, unknown>, idColumn = 'id') {
  const db = getDb()
  const { data, error } = await db
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq(idColumn, id)
    .select()
    .single()
  if (error) throw new Error(`Update ${table}/${id}: ${error.message}`)
  return data
}

export async function deleteRow(table: string, id: string, idColumn = 'id') {
  const db = getDb()
  const { error } = await db.from(table).delete().eq(idColumn, id)
  if (error) throw new Error(`Delete ${table}/${id}: ${error.message}`)
  return { deleted: true, id }
}

export async function countRows(table: string, filters?: Record<string, string | number | boolean>) {
  const db = getDb()
  let q = db.from(table).select('*', { count: 'exact', head: true })
  if (filters) {
    for (const [col, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null) q = q.eq(col, val)
    }
  }
  const { count, error } = await q
  if (error) throw new Error(`Count ${table}: ${error.message}`)
  return count || 0
}
