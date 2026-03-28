import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import os from 'os'

function authenticate(req: NextRequest): boolean {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.MC_API_TOKEN
  if (!expected) return true
  return token === expected
}

function getCpuUsage(): { model: string; cores: number; usage_percent: number; per_core: number[] } {
  const cpus = os.cpus()
  const perCore = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
    const idle = cpu.times.idle
    return Math.round(((total - idle) / total) * 100)
  })
  const avgUsage = perCore.length > 0 ? Math.round(perCore.reduce((a, b) => a + b, 0) / perCore.length) : 0

  return {
    model: cpus[0]?.model || 'Unknown',
    cores: cpus.length,
    usage_percent: avgUsage,
    per_core: perCore,
  }
}

function getMemoryUsage(): { total_gb: number; used_gb: number; free_gb: number; usage_percent: number } {
  const totalBytes = os.totalmem()
  const freeBytes = os.freemem()
  const usedBytes = totalBytes - freeBytes
  const totalGb = totalBytes / (1024 ** 3)
  const usedGb = usedBytes / (1024 ** 3)
  const freeGb = freeBytes / (1024 ** 3)

  return {
    total_gb: Math.round(totalGb * 100) / 100,
    used_gb: Math.round(usedGb * 100) / 100,
    free_gb: Math.round(freeGb * 100) / 100,
    usage_percent: Math.round((usedBytes / totalBytes) * 100),
  }
}

function getDiskUsage(): { mount: string; total_gb: number; used_gb: number; free_gb: number; usage_percent: number }[] {
  try {
    const output = execSync("df -BG --output=target,size,used,avail,pcent / 2>/dev/null || df -g / 2>/dev/null", {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const lines = output.trim().split('\n').slice(1)
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/)
      return {
        mount: parts[0] || '/',
        total_gb: parseInt(parts[1]) || 0,
        used_gb: parseInt(parts[2]) || 0,
        free_gb: parseInt(parts[3]) || 0,
        usage_percent: parseInt((parts[4] || '0').replace('%', '')) || 0,
      }
    })
  } catch {
    return [{ mount: '/', total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 }]
  }
}

function getLoadAverage(): { one_min: number; five_min: number; fifteen_min: number } {
  const [one, five, fifteen] = os.loadavg()
  return {
    one_min: Math.round(one * 100) / 100,
    five_min: Math.round(five * 100) / 100,
    fifteen_min: Math.round(fifteen * 100) / 100,
  }
}

function getProcessMemory(): { rss_mb: number; heap_used_mb: number; heap_total_mb: number; external_mb: number } {
  const mem = process.memoryUsage()
  return {
    rss_mb: Math.round(mem.rss / (1024 ** 2) * 100) / 100,
    heap_used_mb: Math.round(mem.heapUsed / (1024 ** 2) * 100) / 100,
    heap_total_mb: Math.round(mem.heapTotal / (1024 ** 2) * 100) / 100,
    external_mb: Math.round(mem.external / (1024 ** 2) * 100) / 100,
  }
}

function getNetworkInterfaces(): { name: string; address: string; mac: string }[] {
  const interfaces = os.networkInterfaces()
  const result: { name: string; address: string; mac: string }[] = []
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        result.push({ name, address: addr.address, mac: addr.mac })
      }
    }
  }
  return result
}

function getTopProcesses(): { pid: string; cpu: string; mem: string; command: string }[] {
  try {
    const output = execSync("ps aux --sort=-%cpu 2>/dev/null | head -6", {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const lines = output.trim().split('\n').slice(1)
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/)
      return {
        pid: parts[1] || '',
        cpu: parts[2] || '0',
        mem: parts[3] || '0',
        command: parts.slice(10).join(' ').substring(0, 60),
      }
    })
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// GET /api/system-health
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cpu = getCpuUsage()
  const memory = getMemoryUsage()
  const disk = getDiskUsage()
  const load = getLoadAverage()
  const processMemory = getProcessMemory()
  const network = getNetworkInterfaces()
  const topProcesses = getTopProcesses()

  // Determine overall health status
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy'
  if (memory.usage_percent > 90 || cpu.usage_percent > 90 || (disk[0] && disk[0].usage_percent > 90)) {
    status = 'critical'
  } else if (memory.usage_percent > 75 || cpu.usage_percent > 75 || (disk[0] && disk[0].usage_percent > 75)) {
    status = 'degraded'
  }

  return NextResponse.json({
    data: {
      status,
      timestamp: new Date().toISOString(),
      uptime_seconds: os.uptime(),
      uptime_formatted: formatUptime(os.uptime()),
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      node_version: process.version,
      cpu,
      memory,
      disk,
      load_average: load,
      process_memory: processMemory,
      network,
      top_processes: topProcesses,
    },
  })
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}
