"use client"

import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function GlassCard({
  children,
  className,
  hover = true,
  onClick,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-4",
        !hover && "[&]:hover:bg-[var(--glass-bg)] [&]:hover:border-[var(--glass-border)] [&]:hover:shadow-[var(--glass-shadow)]",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export default GlassCard
