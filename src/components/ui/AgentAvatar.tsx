"use client"

import { cn } from "@/lib/utils"

interface AgentAvatarProps {
  name: string
  role?: string
  status?: string
  size?: "sm" | "md" | "lg"
}

const roleAccent: Record<string, string> = {
  developer: "var(--accent-blue)",
  researcher: "var(--accent-cyan)",
  marketer: "var(--accent-rose)",
  analyst: "var(--accent-purple)",
  content: "var(--accent-emerald)",
  va: "var(--accent-amber)",
  custom: "var(--text-secondary)",
}

const statusColor: Record<string, string> = {
  running: "var(--status-running)",
  idle: "var(--status-idle)",
  standby: "var(--status-idle)",
  blocked: "var(--status-blocked)",
  error: "var(--status-error)",
  offline: "var(--status-idle)",
  done: "var(--status-done)",
}

const sizeClasses = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-base",
}

const dotSizes = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
}

export function AgentAvatar({
  name,
  role = "custom",
  status,
  size = "md",
}: AgentAvatarProps) {
  const accent = roleAccent[role] || "var(--text-secondary)"
  const letter = name.charAt(0).toUpperCase()

  return (
    <div className="relative inline-flex shrink-0">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold",
          "backdrop-blur-md",
          sizeClasses[size],
        )}
        style={{
          background: "var(--glass-bg)",
          border: `2px solid ${accent}`,
          color: accent,
        }}
      >
        {letter}
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2",
            dotSizes[size],
            status === "running" && "status-pulse",
          )}
          style={{
            backgroundColor: statusColor[status] || "var(--status-idle)",
            borderColor: "var(--bg-base)",
            color: statusColor[status] || "var(--status-idle)",
          }}
        />
      )}
    </div>
  )
}

export default AgentAvatar
