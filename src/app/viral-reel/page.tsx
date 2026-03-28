'use client'

import { useState } from 'react'
import {
  Video,
  Plus,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import StatusPill from '@/components/ui/StatusPill'

const PIPELINE_STAGES = [
  { id: 'genviral_input', label: 'GenViral Input', color: 'var(--accent-purple)' },
  { id: 'hook_generation', label: 'Hook Generation', color: 'var(--accent-blue)' },
  { id: 'claude_rewrite', label: 'Claude Rewrite', color: 'var(--accent-cyan)' },
  { id: 'heygen_avatar', label: 'HeyGen Avatar', color: 'var(--accent-emerald)' },
  { id: 'pexels_broll', label: 'Pexels B-Roll', color: 'var(--accent-amber)' },
  { id: 'assembly', label: 'Assembly', color: 'var(--accent-rose)' },
  { id: 'genviral_deploy', label: 'GenViral Deploy', color: 'var(--accent-purple)' },
  { id: 'published', label: 'All Platforms', color: 'var(--status-done)' },
] as const

const BRAND_COLORS: Record<string, { color: string; label: string }> = {
  holistic_dr_bright: { color: 'var(--accent-emerald)', label: 'HolisticDrBright' },
  dspiked: { color: 'var(--accent-cyan)', label: 'DSpiked' },
  custom: { color: 'var(--accent-purple)', label: 'Custom' },
}

interface MockReel {
  id: string
  title: string
  brand: string
  stage: string
  target_platform: string
  created_at: string
}

export default function ViralReelPage() {
  const [reels] = useState<MockReel[]>([])

  const getStageIndex = (stage: string) =>
    PIPELINE_STAGES.findIndex((s) => s.id === stage)

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Viral Reel Pipeline
        </h2>
        <button className="glass-button-primary glass-button text-sm flex items-center gap-2">
          <Plus size={14} />
          New Reel
        </button>
      </div>

      {/* Pipeline Flow Diagram */}
      <GlassCard className="p-6">
        <h3 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Pipeline Flow
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-center shrink-0">
              <div
                className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                style={{
                  background: `${stage.color}15`,
                  border: `1px solid ${stage.color}30`,
                  color: stage.color,
                }}
              >
                {stage.label}
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <ChevronRight
                  size={16}
                  className="mx-1 shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                />
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Active Reels */}
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Active Reels
        </h3>
        {reels.length === 0 ? (
          <GlassCard className="p-8 flex flex-col items-center">
            <Video size={40} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
              No reels in production. Create a new reel to start the pipeline.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reels.map((reel) => {
              const stageIdx = getStageIndex(reel.stage)
              const progress = ((stageIdx + 1) / PIPELINE_STAGES.length) * 100
              const brand = BRAND_COLORS[reel.brand] || BRAND_COLORS.custom
              const currentStage = PIPELINE_STAGES[stageIdx]

              return (
                <GlassCard key={reel.id} className="p-5 cursor-pointer">
                  {/* Thumbnail placeholder */}
                  <div
                    className="w-full h-32 rounded-xl mb-3 flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <Video size={24} style={{ color: 'var(--text-muted)' }} />
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {reel.title || 'Untitled Reel'}
                    </h4>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{ background: `${brand.color}22`, color: brand.color }}
                    >
                      {brand.label}
                    </span>
                  </div>

                  {/* Stage indicator */}
                  {currentStage && (
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2
                        size={12}
                        className="animate-spin"
                        style={{ color: currentStage.color }}
                      />
                      <span className="text-xs" style={{ color: currentStage.color }}>
                        {currentStage.label}
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: currentStage?.color || 'var(--accent-blue)',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span>{reel.target_platform}</span>
                    <span>{new Date(reel.created_at).toLocaleDateString()}</span>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
