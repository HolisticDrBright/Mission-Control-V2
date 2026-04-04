import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

// ---------------------------------------------------------------------------
// POST /api/seo/sync-wordpress — Pull posts from WordPress REST API into blog_posts table
// GET  /api/seo/sync-wordpress — Fetch posts directly from WordPress (no DB needed)
// ---------------------------------------------------------------------------

const DEFAULT_WP_URLS = [
  'https://holisticdrbright.com',
  'https://dspiked.com',
]

interface WPPost {
  id: number
  date: string
  slug: string
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  link: string
  status: string
  categories: number[]
  tags: number[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

// GET — Fetch posts directly from WordPress (quick preview, no DB write)
export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const wpUrl = searchParams.get('wp_url') || DEFAULT_WP_URLS[0]
  const perPage = parseInt(searchParams.get('per_page') || '20', 10)
  const page = parseInt(searchParams.get('page') || '1', 10)

  try {
    const res = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&_embed=true&status=publish`,
      { headers: { 'User-Agent': 'MissionControl/1.0' }, signal: AbortSignal.timeout(15000) },
    )

    if (!res.ok) {
      return NextResponse.json({ error: `WordPress returned ${res.status}` }, { status: 502 })
    }

    const totalPosts = parseInt(res.headers.get('X-WP-Total') || '0', 10)
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '0', 10)
    const posts: WPPost[] = await res.json()

    const mapped = posts.map((p) => ({
      wp_id: p.id,
      title: stripHtml(p.title.rendered),
      slug: p.slug,
      excerpt: stripHtml(p.excerpt.rendered).substring(0, 300),
      word_count: countWords(stripHtml(p.content.rendered)),
      published_url: p.link,
      published_at: p.date,
      status: 'published',
      wp_source: wpUrl,
    }))

    return NextResponse.json({
      data: mapped,
      total: totalPosts,
      total_pages: totalPages,
      page,
      per_page: perPage,
      wp_url: wpUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch from WordPress'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

// POST — Pull from WordPress and upsert into blog_posts table
export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  let body: { wp_url?: string; site_id?: string; max_pages?: number }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const wpUrl = body.wp_url || DEFAULT_WP_URLS[0]
  const siteId = body.site_id
  const maxPages = body.max_pages || 10

  try {
    let allPosts: WPPost[] = []
    let page = 1
    let totalPages = 1

    // Paginate through all WordPress posts
    while (page <= totalPages && page <= maxPages) {
      const res = await fetch(
        `${wpUrl}/wp-json/wp/v2/posts?per_page=100&page=${page}&status=publish`,
        { headers: { 'User-Agent': 'MissionControl/1.0' }, signal: AbortSignal.timeout(30000) },
      )

      if (!res.ok) break

      totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10)
      const posts: WPPost[] = await res.json()
      allPosts = allPosts.concat(posts)
      page++
    }

    // Upsert into blog_posts
    let imported = 0
    let skipped = 0

    for (const post of allPosts) {
      const plainContent = stripHtml(post.content.rendered)
      const row: Record<string, unknown> = {
        title: stripHtml(post.title.rendered),
        slug: post.slug,
        status: 'published',
        meta_description: stripHtml(post.excerpt.rendered).substring(0, 160),
        word_count: countWords(plainContent),
        published_url: post.link,
        published_at: post.date,
      }

      if (siteId) row.site_id = siteId

      // Check if already exists by slug
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', post.slug)
        .limit(1)

      if (existing && existing.length > 0) {
        // Update existing
        await supabase.from('blog_posts').update(row).eq('id', existing[0].id)
        skipped++
      } else {
        // Insert new
        const { error } = await supabase.from('blog_posts').insert(row)
        if (!error) imported++
        else skipped++
      }
    }

    return NextResponse.json({
      data: {
        wp_url: wpUrl,
        total_fetched: allPosts.length,
        imported,
        updated: skipped,
        pages_scanned: page - 1,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
