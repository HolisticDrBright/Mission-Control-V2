import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  SKILL_CATALOG,
  categoryFor,
  type SkillCategory,
} from '@/lib/openclaw/skill-catalog'

export const dynamic = 'force-dynamic'

interface LoadedSkill {
  name: string
  category: SkillCategory
  description: string
  source: 'filesystem' | 'catalog'
}

/**
 * Extract the first paragraph description from a SKILL.md file.
 * Strips YAML frontmatter and the first H1 heading, then returns the
 * first non-empty paragraph.
 */
function extractDescription(md: string): string {
  let body = md.replace(/\r\n/g, '\n').trim()

  // Strip YAML frontmatter
  if (body.startsWith('---')) {
    const end = body.indexOf('\n---', 3)
    if (end !== -1) body = body.slice(end + 4).trim()
  }

  // Drop leading H1
  body = body.replace(/^#\s+.*\n+/, '').trim()

  // First non-empty paragraph
  const paragraph = body.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? ''
  return paragraph
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400)
}

function readSkillsFromFilesystem(dir: string): LoadedSkill[] {
  if (!fs.existsSync(dir)) return []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const skills: LoadedSkill[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const name = entry.name
    const skillMd = path.join(dir, name, 'SKILL.md')
    let description = ''
    if (fs.existsSync(skillMd)) {
      try {
        description = extractDescription(fs.readFileSync(skillMd, 'utf-8'))
      } catch {
        // ignore unreadable files
      }
    }
    if (!description) {
      const fallback = SKILL_CATALOG.find((s) => s.name === name)
      description = fallback?.description ?? ''
    }
    skills.push({
      name,
      category: categoryFor(name),
      description,
      source: 'filesystem',
    })
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

function catalogFallback(): LoadedSkill[] {
  return SKILL_CATALOG.map((s) => ({
    name: s.name,
    category: s.category,
    description: s.description,
    source: 'catalog' as const,
  })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET() {
  try {
    const dir = process.env.OPENCLAW_SKILLS_DIR || '/usr/lib/node_modules/openclaw/skills'

    let skills = readSkillsFromFilesystem(dir)
    let source: 'filesystem' | 'catalog' = 'filesystem'
    let skillsDir: string | null = dir

    if (skills.length === 0) {
      skills = catalogFallback()
      source = 'catalog'
      skillsDir = null
    }

    const byCategory: Record<string, number> = {}
    for (const s of skills) {
      byCategory[s.category] = (byCategory[s.category] ?? 0) + 1
    }

    return NextResponse.json({
      total: skills.length,
      source,
      skillsDir,
      byCategory,
      skills,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to load OpenClaw skills', details: message },
      { status: 500 },
    )
  }
}
