import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import { authenticate } from '@/lib/api/auth'

function safeExec(cmd: string): string {
  try {
    const { execSync } = require('child_process')
    return execSync(cmd, { encoding: 'utf-8', timeout: 2000, stdio: ['pipe', 'pipe', 'pipe'] })
  } catch {
    return ''
  }
}

function getCpuUsage(): { model: string; cores: number; usage_percent: number; per_core: number[] } {
  const cpus = os.cpus()
  const perCore = cpus.map((cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0)
    const idle = cpu.times.idle
    return total > 0 ? Math.round(((total - idle) / total) * 100) : 0
  })
  const avgUsage = perCore.length > 0 ? Math.round(perCore.reduce((a, b) => a + b, 0) / perCore.length) : 0

  return {
    model: cpus[0]?.model?.trim() || 'Unknown',
    cores: cpus.length,
    usage_percent: avgUsage,
    per_core: perCore,
  }
}

function getMemoryUsage() {
  const totalBytes = os.totalmem()
  const freeBytes = os.freemem()
  const usedBytes = totalBytes - freeBytes
  return {
    total_gb: Math.round((totalBytes / 1073741824) * 100) / 100,
    used_gb: Math.round((usedBytes / 1073741824) * 100) / 100,
    free_gb: Math.round((freeBytes / 1073741824) * 100) / 100,
    usage_percent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
  }
}

function getDiskUsage() {
  const output = safeExec('df -BG --output=target,size,used,avail,pcent / 2>/dev/null')
  if (!output) return [{ mount: '/', total_gb: 0, used_gb: 0, free_gb: 0, usage_percent: 0 }]

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
}

function getTopProcesses() {
  const output = safeExec('ps aux --sort=-%cpu 2>/dev/null | head -6')
  if (!output) return []

  return output.trim().split('\n').slice(1).map((line) => {
    const parts = line.trim().split(/\s+/)
    return {
      pid: parts[1] || '',
      cpu: parts[2] || '0',
      mem: parts[3] || '0',
      command: parts.slice(10).join(' ').substring(0, 60),
    }
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

// GET /api/system-health
export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cpu = getCpuUsage()
    const memory = getMemoryUsage()
    const disk = getDiskUsage()
    const [one, five, fifteen] = os.loadavg()
    const processMemory = process.memoryUsage()
    const topProcesses = getTopProcesses()

    const interfaces = os.networkInterfaces()
    const network: { name: string; address: string; mac: string }[] = []
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          network.push({ name, address: addr.address, mac: addr.mac })
        }
      }
    }

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
        load_average: {
          one_min: Math.round(one * 100) / 100,
          five_min: Math.round(five * 100) / 100,
          fifteen_min: Math.round(fifteen * 100) / 100,
        },
        process_memory: {
          rss_mb: Math.round(processMemory.rss / 1048576 * 100) / 100,
          heap_used_mb: Math.round(processMemory.heapUsed / 1048576 * 100) / 100,
          heap_total_mb: Math.round(processMemory.heapTotal / 1048576 * 100) / 100,
          external_mb: Math.round(processMemory.external / 1048576 * 100) / 100,
        },
        network,
        top_processes: topProcesses,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'System health check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
