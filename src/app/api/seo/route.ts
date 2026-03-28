import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BlogPostCreateSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function authenticate(req: NextRequest): boolean {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.MC_API_TOKEN
  if (!expected) return true
  return token === expected
}

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const SeoFilterSchema = z.object({
  site_id: z.string().uuid().optional(),
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
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  let postsQuery = supabase.from('blog_posts').select('*', { count: 'exact' })
  let keywordsQuery = supabase.from('keywords').select('*', { count: 'exact' })

  if (filterParse.data.site_id) {
    postsQuery = postsQuery.eq('site_id', filterParse.data.site_id)
    keywordsQuery = keywordsQuery.eq('site_id', filterParse.data.site_id)
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
