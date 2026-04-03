import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticate } from '@/lib/api/auth'

interface Query {
  keyword: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface Page {
  url: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface ContentRecommendation {
  type: 'optimize_existing' | 'create_new' | 'improve_ctr' | 'build_backlinks'
  priority: 'high' | 'medium' | 'low'
  keyword: string
  current_position: number
  impressions: number
  ctr: number
  action: string
  estimated_impact: string
  target_url?: string
}

function calculateGrade(summary: { avgCTR: number; avgPosition: number; totalClicks: number; totalImpressions: number }) {
  let score = 0
  if (summary.avgCTR > 5) score += 30; else if (summary.avgCTR > 3) score += 20; else if (summary.avgCTR > 1) score += 10
  if (summary.avgPosition < 10) score += 30; else if (summary.avgPosition < 20) score += 20; else if (summary.avgPosition < 30) score += 10
  if (summary.totalClicks > 500) score += 20; else if (summary.totalClicks > 100) score += 15; else if (summary.totalClicks > 30) score += 10
  if (summary.totalImpressions > 10000) score += 20; else if (summary.totalImpressions > 3000) score += 15; else if (summary.totalImpressions > 500) score += 10
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'
  return { grade, score }
}

// GET /api/seo/intelligence — Analyze GSC data, find opportunities, generate recommendations
export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const site = searchParams.get('site') || 'all'

  try {
    // Fetch GSC data from internal endpoint
    const gscUrl = `http://localhost:${process.env.PORT || 3001}/api/seo/google-console${site !== 'all' ? `?site=${site}` : ''}`
    const gscRes = await fetch(gscUrl)

    if (!gscRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch GSC data', status: gscRes.status }, { status: 502 })
    }

    const gscData = await gscRes.json()
    const queries: Query[] = gscData.topQueries || []
    const pages: Page[] = gscData.topPages || []
    const summary = gscData.summary || {}

    // 1. Striking Distance Keywords (position 11-30) — easiest to move to page 1
    const strikingDistance = queries
      .filter(q => q.position >= 11 && q.position <= 30)
      .sort((a, b) => a.position - b.position)
      .map(q => ({
        keyword: q.keyword,
        position: Math.round(q.position),
        impressions: q.impressions,
        clicks: q.clicks,
        ctr: q.ctr,
        gap_to_page1: Math.round(q.position - 10),
        potential_clicks: Math.round(q.impressions * 0.08), // ~8% CTR for page 1
      }))

    // 2. High Impression, Low CTR — content exists but title/meta needs work
    const lowCtrOpportunities = queries
      .filter(q => q.impressions > 50 && q.ctr < 0.02)
      .sort((a, b) => b.impressions - a.impressions)
      .map(q => ({
        keyword: q.keyword,
        impressions: q.impressions,
        clicks: q.clicks,
        ctr: q.ctr,
        position: Math.round(q.position),
        potential_clicks: Math.round(q.impressions * 0.05) - q.clicks,
      }))

    // 3. Quick Win Keywords (position 4-10, high impressions) — already ranking, push to top 3
    const quickWins = queries
      .filter(q => q.position >= 4 && q.position <= 10 && q.impressions > 20)
      .sort((a, b) => b.impressions - a.impressions)
      .map(q => ({
        keyword: q.keyword,
        position: Math.round(q.position),
        impressions: q.impressions,
        clicks: q.clicks,
        potential_extra_clicks: Math.round(q.impressions * 0.15) - q.clicks, // top 3 gets ~15% CTR
      }))

    // 4. Content Gap — high impression keywords with no dedicated page
    const contentGaps = queries
      .filter(q => q.impressions > 30 && q.position > 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 10)
      .map(q => ({
        keyword: q.keyword,
        impressions: q.impressions,
        position: Math.round(q.position),
        action: 'Create dedicated long-form content targeting this keyword',
      }))

    // 5. Generate Content Recommendations
    const recommendations: ContentRecommendation[] = []

    // From striking distance
    strikingDistance.slice(0, 5).forEach(q => {
      recommendations.push({
        type: 'optimize_existing',
        priority: q.position <= 15 ? 'high' : 'medium',
        keyword: q.keyword,
        current_position: q.position,
        impressions: q.impressions,
        ctr: q.ctr,
        action: `Optimize existing content for "${q.keyword}". Add keyword to H2 headers, improve internal linking, expand content by 500+ words.`,
        estimated_impact: `Could move from position ${q.position} to top 10, gaining ~${q.potential_clicks} clicks/month`,
      })
    })

    // From low CTR
    lowCtrOpportunities.slice(0, 3).forEach(q => {
      recommendations.push({
        type: 'improve_ctr',
        priority: 'high',
        keyword: q.keyword,
        current_position: q.position,
        impressions: q.impressions,
        ctr: q.ctr,
        action: `Rewrite title tag and meta description for "${q.keyword}" pages. Add power words, numbers, and a clear value proposition.`,
        estimated_impact: `${q.impressions} impressions with ${(q.ctr * 100).toFixed(1)}% CTR → could gain ${q.potential_clicks}+ clicks with better title/meta`,
      })
    })

    // From content gaps
    contentGaps.slice(0, 3).forEach(q => {
      recommendations.push({
        type: 'create_new',
        priority: q.impressions > 100 ? 'high' : 'medium',
        keyword: q.keyword,
        current_position: q.position,
        impressions: q.impressions,
        ctr: 0,
        action: `Create a comprehensive 2000+ word guide targeting "${q.keyword}". Include FAQ schema, internal links to related content.`,
        estimated_impact: `${q.impressions} monthly impressions available. Dedicated content could rank top 10 within 4-6 weeks.`,
      })
    })

    // Sort by priority
    recommendations.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 }
      return p[a.priority] - p[b.priority]
    })

    // 6. Calculate improvement potential
    const totalPotentialClicks = strikingDistance.reduce((s, q) => s + q.potential_clicks, 0) +
      lowCtrOpportunities.reduce((s, q) => s + q.potential_clicks, 0)

    const gradeData = calculateGrade(summary)

    return NextResponse.json({
      site,
      analyzed_at: new Date().toISOString(),
      current_grade: gradeData.grade,
      grade_score: gradeData.score,
      summary: {
        total_clicks: summary.totalClicks || 0,
        total_impressions: summary.totalImpressions || 0,
        avg_ctr: summary.avgCTR || 0,
        avg_position: summary.avgPosition || 0,
        total_queries: queries.length,
        total_pages: pages.length,
      },
      opportunities: {
        striking_distance: {
          count: strikingDistance.length,
          total_potential_clicks: totalPotentialClicks,
          keywords: strikingDistance.slice(0, 15),
        },
        low_ctr: {
          count: lowCtrOpportunities.length,
          keywords: lowCtrOpportunities.slice(0, 10),
        },
        quick_wins: {
          count: quickWins.length,
          keywords: quickWins.slice(0, 10),
        },
        content_gaps: {
          count: contentGaps.length,
          keywords: contentGaps,
        },
      },
      recommendations,
      improvement_potential: {
        estimated_additional_clicks: totalPotentialClicks,
        target_grade: gradeData.score < 50 ? 'C' : gradeData.score < 65 ? 'B' : 'A',
        focus_areas: [
          strikingDistance.length > 5 ? 'Optimize striking-distance keywords (position 11-30)' : null,
          lowCtrOpportunities.length > 3 ? 'Improve title tags and meta descriptions for low-CTR pages' : null,
          contentGaps.length > 3 ? 'Create new content for high-impression keywords without dedicated pages' : null,
          quickWins.length > 3 ? 'Push quick-win keywords from position 4-10 to top 3' : null,
        ].filter(Boolean),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Intelligence analysis failed' }, { status: 500 })
  }
}
