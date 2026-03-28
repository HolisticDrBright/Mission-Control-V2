"use client"

import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface CostBadgeProps {
  amount: number
  trend?: "up" | "down" | "flat"
  size?: "sm" | "md"
}

export function CostBadge({ amount, trend = "flat", size = "md" }: CostBadgeProps) {
  const formatted = `$${amount.toFixed(2)}`

  const trendConfig = {
    up: { icon: ArrowUp, color: "var(--accent-rose)" },
    down: { icon: ArrowDown, color: "var(--accent-emerald)" },
    flat: { icon: Minus, color: "var(--text-muted)" },
  }

  const { icon: TrendIcon, color } = trendConfig[trend]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono rounded-md",
        size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1",
      )}
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        color: "var(--text-primary)",
      }}
    >
      {formatted}
      <TrendIcon
        className={cn(size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")}
        style={{ color }}
      />
    </span>
  )
}

export default CostBadge
