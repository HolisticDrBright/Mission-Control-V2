import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * Simple CSV parser without external dependencies
 */
function parseCSV(content: string) {
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []
  
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: any = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }
  
  return rows
}

/**
 * Calculate SEO Grade (A-F)
 */
function calculateGrade(summary: any) {
  const { avgCTR, avgPosition } = summary
  let score = 0
  
  // CTR scoring (max 40 points)
  if (avgCTR >= 3) score += 40
  else if (avgCTR >= 2) score += 35
  else if (avgCTR >= 1) score += 30
  else if (avgCTR >= 0.5) score += 20
  else score += 10
  
  // Position scoring (max 60 points)
  if (avgPosition <= 3) score += 60
  else if (avgPosition <= 5) score += 55
  else if (avgPosition <= 10) score += 50
  else if (avgPosition <= 20) score += 35
  else if (avgPosition <= 50) score += 20
  else score += 10
  
  // Grade assignment
  if (score >= 90) return { grade: 'A+', score, label: 'Excellent' }
  if (score >= 80) return { grade: 'A', score, label: 'Very Good' }
  if (score >= 70) return { grade: 'B', score, label: 'Good' }
  if (score >= 60) return { grade: 'C', score, label: 'Fair' }
  if (score >= 50) return { grade: 'D', score, label: 'Poor' }
  return { grade: 'F', score, label: 'Critical' }
}

/**
 * GET /api/seo/google-console
 * Returns real Google Search Console data from exported CSVs
 * Query params: ?site=holisticdrbright.com (default) or ?site=dspiked.com
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const site = searchParams.get('site') || 'holisticdrbright.com'
    
    const csvDir = '/tmp'
    
    // Read Queries CSV
    const queriesPath = path.join(csvDir, 'Queries.csv')
    const pagesPath = path.join(csvDir, 'Pages.csv')
    
    let queries = []
    let pages = []
    
    if (fs.existsSync(queriesPath)) {
      const queriesContent = fs.readFileSync(queriesPath, 'utf-8')
      queries = parseCSV(queriesContent)
    }
    
    if (fs.existsSync(pagesPath)) {
      const pagesContent = fs.readFileSync(pagesPath, 'utf-8')
      pages = parseCSV(pagesContent)
    }
    
    // Transform queries data
    const topQueries = queries.slice(0, 20).map((q: any) => ({
      keyword: q['Top queries'],
      clicks: parseInt(q['Clicks']) || 0,
      impressions: parseInt(q['Impressions']) || 0,
      ctr: parseFloat(q['CTR']?.replace('%', '')) / 100 || 0,
      position: parseFloat(q['Position']) || 0,
    }))
    
    // Transform pages data
    const topPages = pages.slice(0, 20).map((p: any) => ({
      url: p['Top pages'],
      clicks: parseInt(p['Clicks']) || 0,
      impressions: parseInt(p['Impressions']) || 0,
      ctr: parseFloat(p['CTR']?.replace('%', '')) / 100 || 0,
      position: parseFloat(p['Position']) || 0,
    }))
    
    // Calculate summary stats
    const totalClicks = queries.reduce((sum: number, q: any) => sum + (parseInt(q['Clicks']) || 0), 0)
    const totalImpressions = queries.reduce((sum: number, q: any) => sum + (parseInt(q['Impressions']) || 0), 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgPosition = queries.length > 0 
      ? queries.reduce((sum: number, q: any) => sum + (parseFloat(q['Position']) || 0), 0) / queries.length 
      : 0
    
    const summary = {
      totalClicks,
      totalImpressions,
      avgCTR: parseFloat(avgCTR.toFixed(2)),
      avgPosition: parseFloat(avgPosition.toFixed(2)),
      totalQueries: queries.length,
      totalPages: pages.length,
    }
    
    const gradeData = calculateGrade(summary)
    
    // Estimate domain authority (rough estimate based on clicks)
    const estimatedDA = Math.min(100, Math.max(10, Math.round(totalClicks / 2)))
    
    return NextResponse.json({
      site,
      source: 'google_search_console_export',
      lastUpdated: new Date().toISOString(),
      summary,
      grade: gradeData.grade,
      gradeScore: gradeData.score,
      gradeLabel: gradeData.label,
      estimatedDA,
      topQueries,
      topPages,
      allQueries: queries,
      allPages: pages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch Google Console data', details: message },
      { status: 500 }
    )
  }
}
