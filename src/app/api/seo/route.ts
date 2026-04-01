import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BlogPostCreateSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const SeoFilterSchema = z.object({
  site_id: z.string().uuid().optional(),
  domain: z.string().optional(),
})

// ---------------------------------------------------------------------------
// GET /api/seo
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = SeoFilterSchema.safeParse({
    site_id: searchParams.get('site_id') ?? undefined,
    domain: searchParams.get('domain') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ data: { blog_posts: [], keywords: [] }, counts: { blog_posts: 0, keywords: 0 }, message: 'Database not configured' })
  }

  let postsQuery = supabase.from('blog_posts').select('*', { count: 'exact' })
  let keywordsQuery = supabase.from('keywords').select('*', { count: 'exact' })

  if (filterParse.data.site_id) {
    postsQuery = postsQuery.eq('site_id', filterParse.data.site_id)
    keywordsQuery = keywordsQuery.eq('site_id', filterParse.data.site_id)
  }

  // Filter by domain in URL (e.g., ?domain=holisticdrbright.com)
  if (filterParse.data.domain) {
    postsQuery = postsQuery.ilike('url', `%${filterParse.data.domain}%`)
  }

  const [postsResult, keywordsResult] = await Promise.all([postsQuery, keywordsQuery])

  if (postsResult.error) {
    return NextResponse.json({ error: postsResult.error.message }, { status: 500 })
  }
  if (keywordsResult.error) {
    return NextResponse.json({ error: keywordsResult.error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: { blog_posts: postsResult.data, keywords: keywordsResult.data },
    counts: { blog_posts: postsResult.count, keywords: keywordsResult.count },
  })
}

// ---------------------------------------------------------------------------
// POST /api/seo  (create blog post)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parse = BlogPostCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert(parse.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
