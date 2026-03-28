"use client"

import { useEffect, useRef } from "react"
import { Bot, CheckSquare, AlertTriangle, Server, Rocket, Activity } from "lucide-react"
import { useStore } from "@/store"
import { cn } from "@/lib/utils"

const eventIcons: Record<string, React.ElementType> = {
  agent_status: Bot,
  task_completed: CheckSquare,
  task_failed: AlertTriangle,
  job_run: Server,
  pipeline_stage: Rocket,
  ml_ops: Activity,
}

const eventColors: Record<string, string> = {
  agent_status: "var(--accent-purple)",
  task_completed: "var(--accent-blue)",
  task_failed: "var(--accent-rose)",
  job_run: "var(--accent-cyan)",
  pipeline_stage: "var(--accent-emerald)",
  ml_ops: "var(--accent-amber)",
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export function LiveFeed() {
  const activityLog = useStore((s) => s.activityLog)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activityLog])

  return (
    <div className="glass-card p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Live Feed
      </h3>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 min-h-0"
      >
        {activityLog.map((event) => {
          const Icon = eventIcons[event.event_type] || Activity
          const color = eventColors[event.event_type] || "var(--text-secondary)"
          return (
            <div
              key={event.id}
              className={cn(
                "flex items-start gap-2.5 px-2 py-1.5 rounded-lg transition-colors",
                "hover:bg-[var(--glass-bg-hover)]",
              )}
            >
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-relaxed truncate" style={{ color: "var(--text-primary)" }}>
                  {event.description}
                </p>
                <p className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {formatTime(event.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        {activityLog.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            No activity yet
          </p>
        )}
      </div>
    </div>
  )
}
