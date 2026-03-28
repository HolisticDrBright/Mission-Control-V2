import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ViralReelCreateSchema, ViralReelStageSchema } from '@/lib/validation'
import type { ViralReel } from '@/lib/types'

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

const MOCK_REELS: ViralReel[] = [
  {
    id: 'vr000001-0001-4000-8000-000000000001',
    title: 'Top 5 Gut Health Myths',
    brand: 'holistic_dr_bright',
    product: 'Probiotic Plus',
    target_platform: 'tiktok',
    stage: 'script_draft',
    brief: 'Debunk common gut health myths in a fast-paced, engaging reel.',
    generated_hooks: [
      'Your gut is lying to you...',
      'Stop doing THIS to your gut!',
      'Doctors won\'t tell you this about probiotics',
    ],
    selected_hook: 'Your gut is lying to you...',
    script_draft: 'Hook: Your gut is lying to you. Here are 5 myths...',
    script_final: null,
    voice_id: null,
    avatar_id: null,
    avatar_video_url: null,
    broll_queries: ['gut health', 'probiotics', 'digestive system'],
    broll_clips: null,
    assembled_video_url: null,
    captioned_video_url: null,
    thumbnail_url: null,
    published_urls: null,
    published_at: null,
    engagement_data: null,
    outcome_score: null,
    hook_style: 'myth-buster',
    cta_type: 'link_in_bio',
    duration_seconds: 45,
    avatar_demographic: 'female_30s_professional',
    created_at: '2026-03-26T10:00:00Z',
    updated_at: '2026-03-28T08:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Query filter schema
// ---------------------------------------------------------------------------

const ReelFilterSchema = z.object({
  stage: ViralReelStageSchema.optional(),
})

// ---------------------------------------------------------------------------
// GET /api/viral-reel
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const filterParse = ReelFilterSchema.safeParse({
    stage: searchParams.get('stage') ?? undefined,
  })

  if (!filterParse.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: filterParse.error.flatten() },
      { status: 400 },
    )
  }

  let reels = [...MOCK_REELS]
  if (filterParse.data.stage) {
    reels = reels.filter((r) => r.stage === filterParse.data.stage)
  }

  return NextResponse.json({ data: reels, count: reels.length })
}

// ---------------------------------------------------------------------------
// POST /api/viral-reel  (create reel + start pipeline)
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

  const parse = ViralReelCreateSchema.safeParse(body)
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.flatten() },
      { status: 422 },
    )
  }

  const now = new Date().toISOString()
  const newReel: ViralReel = {
    id: crypto.randomUUID(),
    ...parse.data,
    created_at: now,
    updated_at: now,
  }

  // TODO: Trigger actual pipeline (hook generation, etc.) once services are connected
  const pipelineStarted = true

  return NextResponse.json(
    { data: newReel, pipeline_started: pipelineStarted },
    { status: 201 },
  )
}
