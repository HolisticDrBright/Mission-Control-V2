import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BlogPostCreateSchema } from '@/lib/validation'
import type { BlogPost, Keyword } from '@/lib/types'

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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: 'bp000001-0001-4000-8000-000000000001',
    site_id: 'site0001-0001-4000-8000-000000000001',
    title: '10 Natural Remedies for Better Sleep',
    slug: '10-natural-remedies-better-sleep',
    status: 'published',
    target_keyword: 'natural sleep remedies',
    secondary_keywords: ['herbal sleep aids', 'melatonin alternatives'],
    meta_description: 'Discover 10 proven natural remedies for better sleep without medication.',
    content: null,
    word_count: 2400,
    seo_score: 87,
    published_url: 'https://holisticdrbright.com/blog/10-natural-remedies-better-sleep',
    published_at: '2026-03-20T12:00:00Z',
    notion_page_id: null,
    notion_last_synced_at: null,
    assigned_agent_id: 'ag000001-0002-4000-8000-000000000002',
    estimated_traffic: 1200,
    actual_traffic: 890,
    created_at: '2026-03-15T08:00:00Z',
    updated_at: '2026-03-27T10:00:00Z',
  },
  {
    id: 'bp000001-0002-4000-8000-000000000002',
    site_id: 'site0001-0001-4000-8000-000000000001',
    title: 'The Complete Guide to Adaptogens',
    slug: 'complete-guide-adaptogens',
    status: 'writing',
    target_keyword: 'adaptogens guide',
    secondary_keywords: ['ashwagandha benefits', 'rhodiola rosea'],
    meta_description: null,
    content: null,
    word_count: null,
    seo_score: null,
    published_url: null,
    published_at: null,
    notion_page_id: null,
    notion_last_synced_at: null,
    assigned_agent_id: 'ag000001-0002-4000-8000-000000000002',
    estimated_traffic: 800,
    actual_traffic: null,
    created_at: '2026-03-25T09:00:00Z',
    updated_at: '2026-03-28T08:00:00Z',
  },
]

const MOCK_KEYWORDS: Keyword[] = [
  {
    id: 'kw000001-0001-4000-8000-000000000001',
    site_id: 'site0001-0001-4000-8000-000000000001',
    keyword: 'natural sleep remedies',
    search_volume: 12000,
    difficulty: 42,
    current_rank: 8,
    target_rank: 3,
    linked_post_id: 'bp000001-0001-4000-8000-000000000001',
    last_checked_at: '2026-03-28T06:00:00Z',
    created_at: '2026-03-15T08:00:00Z',
  },
  {
    id: 'kw000001-0002-4000-8000-000000000002',
    site_id: 'site0001-0001-4000-8000-000000000001',
    keyword: 'adaptogens guide',
    search_volume: 5400,
    difficulty: 35,
    current_rank: null,
    target_rank: 5,
    linked_post_id: 'bp000001-0002-4000-8000-000000000002',
    last_checked_at: '2026-03-28T06:00:00Z',
    created_at: '2026-03-25T09:00:00Z',
  },
]

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

  let posts = [...MOCK_BLOG_POSTS]
  let keywords = [...MOCK_KEYWORDS]

  if (filterParse.data.site_id) {
    posts = posts.filter((p) => p.site_id === filterParse.data.site_id)
    keywords = keywords.filter((k) => k.site_id === filterParse.data.site_id)
  }

  return NextResponse.json({
    data: { blog_posts: posts, keywords },
    counts: { blog_posts: posts.length, keywords: keywords.length },
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

  const now = new Date().toISOString()
  const newPost: BlogPost = {
    id: crypto.randomUUID(),
    ...parse.data,
    created_at: now,
    updated_at: now,
  }

  return NextResponse.json({ data: newPost }, { status: 201 })
}
