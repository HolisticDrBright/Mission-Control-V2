import type { ViralReel, ViralReelStage, VIRAL_REEL_STAGES } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Stage result type
// ---------------------------------------------------------------------------

interface PipelineStageResult {
  stage: ViralReelStage
  success: boolean
  output: Record<string, unknown>
  error: string | null
  duration_ms: number
}

// ---------------------------------------------------------------------------
// Stage ordering (uses the stages from types.ts)
// ---------------------------------------------------------------------------

const STAGE_ORDER: ViralReelStage[] = [
  'brief',
  'hook_generation',
  'hook_selection',
  'script_draft',
  'script_final',
  'voice_generation',
  'avatar_video',
  'broll_sourcing',
  'assembly',
  'captioning',
  'thumbnail',
  'review',
  'published',
]

function nextStage(current: ViralReelStage): ViralReelStage | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

// ---------------------------------------------------------------------------
// Pipeline Manager
// ---------------------------------------------------------------------------

export async function advanceStage(reelId: string): Promise<PipelineStageResult> {
  const supabase = await createClient()
  const { data: reel, error } = await supabase
    .from('viral_reels')
    .select('*')
    .eq('id', reelId)
    .single()

  if (error || !reel) {
    throw new Error(`Reel ${reelId} not found: ${error?.message}`)
  }

  const viralReel = reel as ViralReel
  const startTime = Date.now()

  let result: PipelineStageResult

  try {
    switch (viralReel.stage) {
      case 'brief':
        result = await handleGenViralInput(viralReel)
        break
      case 'hook_generation':
        result = await handleHookGeneration(viralReel)
        break
      case 'hook_selection':
        // Hook selection is typically a human step; auto-advance
        result = {
          stage: 'hook_selection',
          success: viralReel.selected_hook !== null,
          output: { selected_hook: viralReel.selected_hook },
          error: viralReel.selected_hook ? null : 'No hook selected yet',
          duration_ms: Date.now() - startTime,
        }
        break
      case 'script_draft':
        result = await handleClaudeRewrite(viralReel)
        break
      case 'script_final':
        // Script final is typically a human review step
        result = {
          stage: 'script_final',
          success: viralReel.script_final !== null,
          output: { script_final: viralReel.script_final },
          error: viralReel.script_final ? null : 'Script not finalized yet',
          duration_ms: Date.now() - startTime,
        }
        break
      case 'voice_generation':
        result = await handleHeyGenAvatar(viralReel)
        break
      case 'avatar_video':
        result = await handleHeyGenAvatar(viralReel)
        break
      case 'broll_sourcing':
        result = await handlePexelsBRoll(viralReel)
        break
      case 'assembly':
        result = await handleAssembly(viralReel)
        break
      case 'captioning':
        // Captioning is handled by the assembly service
        result = {
          stage: 'captioning',
          success: viralReel.captioned_video_url !== null,
          output: { captioned_video_url: viralReel.captioned_video_url },
          error: viralReel.captioned_video_url
            ? null
            : 'Captioned video not ready',
          duration_ms: Date.now() - startTime,
        }
        break
      case 'thumbnail':
        // Thumbnail generation
        result = {
          stage: 'thumbnail',
          success: viralReel.thumbnail_url !== null,
          output: { thumbnail_url: viralReel.thumbnail_url },
          error: viralReel.thumbnail_url ? null : 'Thumbnail not ready',
          duration_ms: Date.now() - startTime,
        }
        break
      case 'review':
        result = await handleGenViralDeploy(viralReel)
        break
      default:
        result = {
          stage: viralReel.stage,
          success: false,
          output: {},
          error: `No handler for stage: ${viralReel.stage}`,
          duration_ms: Date.now() - startTime,
        }
    }
  } catch (err) {
    result = {
      stage: viralReel.stage,
      success: false,
      output: {},
      error: err instanceof Error ? err.message : String(err),
      duration_ms: Date.now() - startTime,
    }
  }

  // If successful, advance to next stage
  if (result.success) {
    const next = nextStage(viralReel.stage)
    if (next) {
      const updateData: Record<string, unknown> = {
        stage: next,
        updated_at: new Date().toISOString(),
        ...result.output,
      }

      await supabase.from('viral_reels').update(updateData).eq('id', reelId)

      // If we just moved to published, schedule outcome collection
      if (next === 'published') {
        await scheduleOutcomeCollection(reelId)
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Stage Handlers
// ---------------------------------------------------------------------------

async function handleGenViralInput(
  reel: ViralReel
): Promise<PipelineStageResult> {
  const startTime = Date.now()

  const response = await fetch(
    `${process.env.GENVIRAL_API_URL ?? 'http://localhost:8100'}/api/generate-input`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reel.title,
        brand: reel.brand,
        product: reel.product,
        brief: reel.brief,
      }),
    }
  )

  if (!response.ok) {
    return {
      stage: 'brief',
      success: false,
      output: {},
      error: `GenViral API returned ${response.status}: ${await response.text()}`,
      duration_ms: Date.now() - startTime,
    }
  }

  const data = (await response.json()) as { hooks: string[] }

  return {
    stage: 'brief',
    success: true,
    output: { generated_hooks: data.hooks },
    error: null,
    duration_ms: Date.now() - startTime,
  }
}

async function handleHookGeneration(
  reel: ViralReel
): Promise<PipelineStageResult> {
  const startTime = Date.now()

  const response = await fetch(
    `${process.env.GENVIRAL_API_URL ?? 'http://localhost:8100'}/api/generate-hooks`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reel.title,
        brand: reel.brand,
        brief: reel.brief,
        hook_style: reel.hook_style,
        count: 5,
      }),
    }
  )

  if (!response.ok) {
    return {
      stage: 'hook_generation',
      success: false,
      output: {},
      error: `Hook generation failed: ${response.status}`,
      duration_ms: Date.now() - startTime,
    }
  }

  const data = (await response.json()) as { hooks: string[] }

  return {
    stage: 'hook_generation',
    success: true,
    output: { generated_hooks: data.hooks },
    error: null,
    duration_ms: Date.now() - startTime,
  }
}

async function handleClaudeRewrite(
  reel: ViralReel
): Promise<PipelineStageResult> {
  const startTime = Date.now()

  const response = await fetch(
    `${process.env.CLAUDE_REWRITE_URL ?? 'http://localhost:8200'}/api/rewrite`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY ?? ''}`,
      },
      body: JSON.stringify({
        hook: reel.selected_hook,
        title: reel.title,
        brand: reel.brand,
        product: reel.product,
        style: 'viral_short_form',
        duration_target: reel.duration_seconds ?? 60,
      }),
    }
  )

  if (!response.ok) {
    return {
      stage: 'script_draft',
      success: false,
      output: {},
      error: `Claude rewrite failed: ${response.status}`,
      duration_ms: Date.now() - startTime,
    }
  }

  const data = (await response.json()) as { script: string }

  return {
    stage: 'script_draft',
    success: true,
    output: { script_draft: data.script },
    error: null,
    duration_ms: Date.now() - startTime,
  }
}

async function handleHeyGenAvatar(
  reel: ViralReel
): Promise<PipelineStageResult> {
  const startTime = Date.now()

  const script = reel.script_final ?? reel.script_draft ?? reel.selected_hook ?? ''
  if (!script) {
    return {
      stage: 'avatar_video',
      success: false,
      output: {},
      error: 'No script available for avatar generation',
      duration_ms: Date.now() - startTime,
    }
  }

  const response = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.HEYGEN_API_KEY ?? '',
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: reel.avatar_id ?? process.env.HEYGEN_DEFAULT_AVATAR_ID ?? 'default',
          },
          voice: {
            type: 'text',
            input_text: script,
            voice_id: reel.voice_id ?? process.env.HEYGEN_DEFAULT_VOICE_ID ?? 'default',
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
  })

  if (!response.ok) {
    return {
      stage: 'avatar_video',
      success: false,
      output: {},
      error: `HeyGen API returned ${response.status}: ${await response.text()}`,
      duration_ms: Date.now() - startTime,
    }
  }

  const data = (await response.json()) as { data: { video_id: string } }
  const videoUrl = await pollHeyGenVideo(data.data.video_id)

  return {
    stage: 'avatar_video',
    success: true,
    output: { avatar_video_url: videoUrl },
    error: null,
    duration_ms: Date.now() - startTime,
  }
}

async function pollHeyGenVideo(videoId: string): Promise<string> {
  const maxAttempts = 60
  const intervalMs = 10000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))

    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
      {
        headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY ?? '' },
      }
    )

    if (!response.ok) continue

    const data = (await response.json()) as {
      data: { status: string; video_url?: string }
    }

    if (data.data.status === 'completed' && data.data.video_url) {
      return data.data.video_url
    }

    if (data.data.status === 'failed') {
      throw new Error('HeyGen video generation failed')
    }
  }

  throw new Error('HeyGen video generation timed out')
}

async function handlePexelsBRoll(
  reel: ViralReel
): Promise<PipelineStageResult> {
  const startTime = Date.now()

  // Use existing broll_queries or derive from title/product
  const queries =
    reel.broll_queries && reel.broll_queries.length > 0
      ? reel.broll_queries
      : [reel.title, reel.product ?? '']
          .filter(Boolean)
          .flatMap((q) => (q ?? '').split(' ').filter((w) => w.length > 3))
          .slice(0, 3)

  const clips: string[] = []

  for (const query of queries) {
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY ?? '' },
      }
    )

    if (!response.ok) continue

    const data = (await response.json()) as {
      videos: Array<{
        video_files: Array<{ link: string; width: number; quality: string }>
      }>
    }

    for (const video of data.videos) {
      const hdFile = video.video_files.find(
        (f) => f.quality === 'hd' || f.width >= 720
      )
      if (hdFile) {
        clips.push(hdFile.link)
      }
    }
  }

  return {
    stage: 'broll_sourcing',
    success: clips.length > 0,
    output: { broll_clips: clips },
    error: clips.length === 0 ? 'No B-roll clips found' : null,
    duration_ms: Date.now() - startTime,
  }
}

async function handleAssembly(reel: ViralReel): Promise<PipelineStageResult> {
  const startTime = Date.now()

  if (!reel.avatar_video_url) {
    return {
      stage: 'assembly',
      success: false,
      output: {},
      error: 'No avatar video available for assembly',
      duration_ms: Date.now() - startTime,
    }
  }

  const response = await fetch(
    `${process.env.ASSEMBLY_SERVICE_URL ?? 'http://localhost:8300'}/api/assemble`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        avatar_video_url: reel.avatar_video_url,
        broll_clips: reel.broll_clips ?? [],
        script: reel.script_final ?? reel.script_draft,
        hook: reel.selected_hook,
        cta_type: reel.cta_type,
        output_format: 'mp4',
        resolution: '1080x1920',
        add_captions: true,
      }),
    }
  )

  if (!response.ok) {
    return {
      stage: 'assembly',
      success: false,
      output: {},
      error: `Assembly service returned ${response.status}`,
      duration_ms: Date.now() - startTime,
    }
  }

  const data = (await response.json()) as {
    assembled_video_url: string
    captioned_video_url?: string
  }

  return {
    stage: 'assembly',
    success: true,
    output: {
      assembled_video_url: data.assembled_video_url,
      captioned_video_url: data.captioned_video_url ?? null,
    },
    error: null,
    duration_ms: Date.now() - startTime,
  }
}

async function handleGenViralDeploy(
  reel: ViralReel
): Promise<PipelineStageResult> {
  const startTime = Date.now()

  const videoUrl =
    reel.captioned_video_url ?? reel.assembled_video_url ?? reel.avatar_video_url
  if (!videoUrl) {
    return {
      stage: 'review',
      success: false,
      output: {},
      error: 'No video available for deployment',
      duration_ms: Date.now() - startTime,
    }
  }

  const response = await fetch(
    `${process.env.GENVIRAL_API_URL ?? 'http://localhost:8100'}/api/deploy`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        title: reel.title,
        hook: reel.selected_hook,
        brand: reel.brand,
        thumbnail_url: reel.thumbnail_url,
        target_platform: reel.target_platform,
        platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'],
      }),
    }
  )

  if (!response.ok) {
    return {
      stage: 'review',
      success: false,
      output: {},
      error: `GenViral deploy failed: ${response.status}`,
      duration_ms: Date.now() - startTime,
    }
  }

  const data = (await response.json()) as {
    published_urls: string[]
    published_at: string
  }

  return {
    stage: 'review',
    success: true,
    output: {
      published_urls: data.published_urls,
      published_at: data.published_at,
    },
    error: null,
    duration_ms: Date.now() - startTime,
  }
}

// ---------------------------------------------------------------------------
// Outcome Collection Scheduling (T+7 days post-publish)
// ---------------------------------------------------------------------------

export async function scheduleOutcomeCollection(reelId: string): Promise<void> {
  const supabase = await createClient()

  const collectAt = new Date()
  collectAt.setDate(collectAt.getDate() + 7)

  await supabase.from('scheduled_jobs').insert({
    name: `outcome_collection_${reelId}`,
    description: `Collect engagement metrics 7 days after publish for reel ${reelId}`,
    job_type: 'monitoring',
    cron_expression: '', // One-shot, not recurring
    enabled: true,
    last_run_at: null,
    next_run_at: collectAt.toISOString(),
    last_run_status: null,
    last_run_output: null,
    run_count: 0,
    fail_count: 0,
    prevent_overlap: true,
    is_running: false,
    created_at: new Date().toISOString(),
  })
}
