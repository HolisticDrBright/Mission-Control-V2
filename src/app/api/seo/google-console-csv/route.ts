import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * Google Search Console CSV Workaround
 *
 * Reads CSV exports from /tmp and returns GSC-shaped JSON.
 * Supports per-site CSVs so HolisticDrBright and DSpiked can be analyzed
 * independently without needing OAuth.
 *
 * Usage:
 *   GET /api/seo/google-console-csv?site=holisticdrbright.com
 *     → /tmp/Queries.csv + /tmp/Pages.csv
 *   GET /api/seo/google-console-csv?site=dspiked.com
 *     → /tmp/Queries_dspiked.csv + /tmp/Pages_dspiked.csv
 *
 * Drop new CSV exports into /tmp/ and they are picked up automatically.
 */

type CsvRow = Record<string, string>

interface Summary {
  totalClicks: number
  totalImpressions: number
  avgCTR: number
  avgPosition: number
  totalQueries: number
  totalPages: number
}

/**
 * Minimal CSV parser that handles quoted fields with embedded commas.
 */
function parseCSV(content: string): CsvRow[] {
  const lines = content.replace(/\r\n/g, '\n').trim().split('\n')
  if (lines.length < 2) return []

  const parseLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur.trim())
    return out
  }

  const headers = parseLine(lines[0])
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue
    const values = parseLine(lines[i])
    const row: CsvRow = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

/**
 * Pick a field from a CSV row using a list of candidate column names.
 */
function pick(row: CsvRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k]
  }
  return ''
}

function toNum(v: string): number {
  if (!v) return 0
  const cleaned = v.replace(/[%,]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

/**
 * SEO Grade (A–F) based on CTR + avg position, weighted by traffic volume.
 *   - avgCTR goal: 3%+
 *   - avgPosition goal: top 10
 *   - impressions act as a reach multiplier
 *   - clicks are actual delivered traffic
 */
function calculateGrade(summary: Summary): { grade: string; score: number; label: string } {
  const { avgCTR, avgPosition, totalImpressions, totalClicks } = summary
  let score = 0

  // CTR (max 40)
  if (avgCTR >= 5) score += 40
  else if (avgCTR >= 3) score += 35
  else if (avgCTR >= 2) score += 28
  else if (avgCTR >= 1) score += 20
  else if (avgCTR >= 0.5) score += 12
  else score += 5

  // Position (max 40)
  if (avgPosition > 0 && avgPosition <= 3) score += 40
  else if (avgPosition <= 5) score += 35
  else if (avgPosition <= 10) score += 30
  else if (avgPosition <= 20) score += 20
  else if (avgPosition <= 50) score += 10
  else score += 3

  // Impressions reach (max 10)
  if (totalImpressions >= 100000) score += 10
  else if (totalImpressions >= 10000) score += 7
  else if (totalImpressions >= 1000) score += 4
  else if (totalImpressions >= 100) score += 2

  // Clicks delivered (max 10)
  if (totalClicks >= 1000) score += 10
  else if (totalClicks >= 100) score += 7
  else if (totalClicks >= 25) score += 4
  else if (totalClicks >= 5) score += 2

  if (score >= 90) return { grade: 'A+', score, label: 'Excellent' }
  if (score >= 80) return { grade: 'A', score, label: 'Very Good' }
  if (score >= 70) return { grade: 'B', score, label: 'Good' }
  if (score >= 60) return { grade: 'C', score, label: 'Fair' }
  if (score >= 50) return { grade: 'D', score, label: 'Poor' }
  return { grade: 'F', score, label: 'Critical' }
}

/**
 * Resolve CSV paths for a given site. Falls back to the default
 * /tmp/Queries.csv + /tmp/Pages.csv when the per-site files don't exist.
 */
function resolveCsvPaths(site: string): { queriesPath: string; pagesPath: string; resolvedFrom: string } {
  const dir = '/tmp'
  const normalized = site.toLowerCase().replace(/^www\./, '').replace(/\.(com|net|org|io|co).*$/, '')

  const candidates: Array<{ q: string; p: string; label: string }> = []

  if (normalized.includes('dspiked')) {
    candidates.push({
      q: path.join(dir, 'Queries_dspiked.csv'),
      p: path.join(dir, 'Pages_dspiked.csv'),
      label: 'dspiked',
    })
  } else if (normalized.includes('holistic')) {
    candidates.push({
      q: path.join(dir, 'Queries_holisticdrbright.csv'),
      p: path.join(dir, 'Pages_holisticdrbright.csv'),
      label: 'holisticdrbright',
    })
  }

  // Default fallback (legacy single-site export)
  candidates.push({
    q: path.join(dir, 'Queries.csv'),
    p: path.join(dir, 'Pages.csv'),
    label: 'default',
  })

  for (const c of candidates) {
    if (fs.existsSync(c.q) || fs.existsSync(c.p)) {
      return { queriesPath: c.q, pagesPath: c.p, resolvedFrom: c.label }
    }
  }

  return {
    queriesPath: path.join(dir, 'Queries.csv'),
    pagesPath: path.join(dir, 'Pages.csv'),
    resolvedFrom: 'default',
  }
}

export async function GET(request: NextRequest) {
  try {
    const site = request.nextUrl.searchParams.get('site') || 'holisticdrbright.com'
    const { queriesPath, pagesPath, resolvedFrom } = resolveCsvPaths(site)

    let queries: CsvRow[] = []
    let pages: CsvRow[] = []
    const filesRead: string[] = []
    const filesMissing: string[] = []

    if (fs.existsSync(queriesPath)) {
      queries = parseCSV(fs.readFileSync(queriesPath, 'utf-8'))
      filesRead.push(path.basename(queriesPath))
    } else {
      filesMissing.push(path.basename(queriesPath))
    }

    if (fs.existsSync(pagesPath)) {
      pages = parseCSV(fs.readFileSync(pagesPath, 'utf-8'))
      filesRead.push(path.basename(pagesPath))
    } else {
      filesMissing.push(path.basename(pagesPath))
    }

    // Normalize rows. GSC exports use "Top queries" / "Top pages" headers,
    // but we also accept "Query"/"Page" in case the export format changes.
    const topQueries = queries.map((q) => {
      const ctrRaw = pick(q, ['CTR', 'Ctr'])
      return {
        keyword: pick(q, ['Top queries', 'Query', 'Queries']),
        clicks: toNum(pick(q, ['Clicks'])),
        impressions: toNum(pick(q, ['Impressions'])),
        ctr: toNum(ctrRaw) / (ctrRaw.includes('%') ? 100 : 1),
        position: toNum(pick(q, ['Position', 'Average position'])),
      }
    })

    const topPages = pages.map((p) => {
      const ctrRaw = pick(p, ['CTR', 'Ctr'])
      return {
        url: pick(p, ['Top pages', 'Page', 'Pages']),
        clicks: toNum(pick(p, ['Clicks'])),
        impressions: toNum(pick(p, ['Impressions'])),
        ctr: toNum(ctrRaw) / (ctrRaw.includes('%') ? 100 : 1),
        position: toNum(pick(p, ['Position', 'Average position'])),
      }
    })

    const totalClicks = topQueries.reduce((s, q) => s + q.clicks, 0)
    const totalImpressions = topQueries.reduce((s, q) => s + q.impressions, 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgPosition =
      topQueries.length > 0
        ? topQueries.reduce((s, q) => s + q.position, 0) / topQueries.length
        : 0

    const summary: Summary = {
      totalClicks,
      totalImpressions,
      avgCTR: parseFloat(avgCTR.toFixed(2)),
      avgPosition: parseFloat(avgPosition.toFixed(2)),
      totalQueries: topQueries.length,
      totalPages: topPages.length,
    }

    const gradeData = calculateGrade(summary)
    const estimatedDA = Math.min(100, Math.max(10, Math.round(totalClicks / 2)))

    return NextResponse.json({
      site,
      source: 'google_search_console_csv',
      resolvedFrom,
      filesRead,
      filesMissing,
      lastUpdated: new Date().toISOString(),
      summary,
      grade: gradeData.grade,
      gradeScore: gradeData.score,
      gradeLabel: gradeData.label,
      estimatedDA,
      topQueries: topQueries.slice(0, 20),
      topPages: topPages.slice(0, 20),
      allQueries: topQueries,
      allPages: topPages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to read Google Console CSV', details: message },
      { status: 500 },
    )
  }
}
