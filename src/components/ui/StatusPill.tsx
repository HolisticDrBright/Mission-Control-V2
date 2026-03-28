"use client"

import { cn } from "@/lib/utils"

interface StatusPillProps {
  status: string
  size?: "sm" | "md"
}

const statusColorMap: Record<string, string> = {
  // Agent statuses
  running: "var(--status-running)",
  idle: "var(--status-idle)",
  standby: "var(--status-idle)",
  error: "var(--status-error)",
  offline: "var(--status-idle)",
  // Kanban statuses
  backlog: "var(--text-muted)",
  planned: "var(--accent-purple)",
  in_progress: "var(--status-running)",
  blocked: "var(--status-blocked)",
  review: "var(--accent-blue)",
  testing: "var(--accent-cyan)",
  done: "var(--status-done)",
  // Project statuses
  active: "var(--status-running)",
  paused: "var(--status-blocked)",
  archived: "var(--text-muted)",
  // Priorities
  critical: "var(--accent-rose)",
  high: "var(--accent-amber)",
  medium: "var(--accent-blue)",
  low: "var(--text-muted)",
  // VA statuses
  pending: "var(--text-muted)",
  waiting_on_you: "var(--accent-amber)",
  // Generic
  success: "var(--status-running)",
  failed: "var(--status-error)",
  healthy: "var(--status-running)",
}

const statusLabelMap: Record<string, string> = {
  in_progress: "In Progress",
  waiting_on_you: "Waiting",
  ml_ops: "ML Ops",
}

function formatLabel(status: string): string {
  if (statusLabelMap[status]) return statusLabelMap[status]
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  const color = statusColorMap[status] || "var(--text-muted)"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
      )}
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          status === "running" && "status-pulse",
        )}
        style={{ backgroundColor: color, color }}
      />
      {formatLabel(status)}
    </span>
  )
}

export default StatusPill
