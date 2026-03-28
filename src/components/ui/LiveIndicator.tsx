"use client"

import { cn } from "@/lib/utils"

type LiveStatus = "healthy" | "degraded" | "critical" | "offline"

interface LiveIndicatorProps {
  status: LiveStatus
  label?: string
}

const statusColors: Record<LiveStatus, string> = {
  healthy: "var(--status-running)",
  degraded: "var(--status-blocked)",
  critical: "var(--status-error)",
  offline: "var(--status-idle)",
}

export function LiveIndicator({ status, label }: LiveIndicatorProps) {
  const color = statusColors[status]

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          status === "healthy" && "status-pulse",
        )}
        style={{ backgroundColor: color, color }}
      />
      {label && (
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
      )}
    </span>
  )
}

export default LiveIndicator
