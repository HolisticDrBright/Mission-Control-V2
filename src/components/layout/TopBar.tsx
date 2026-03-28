"use client"

import { usePathname } from "next/navigation"
import { Bell, Settings, Search } from "lucide-react"
import { useStore } from "@/store"

const pathTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/agents": "Agents",
  "/scheduler": "Scheduler",
  "/inbox": "Inbox",
  "/viral-reel": "Viral Reel",
  "/seo/holistic-dr-bright": "HolisticDrBright SEO",
  "/seo/dspiked": "DSpiked SEO",
  "/va-tasks": "VA Tasks",
  "/ml-ops": "ML Ops",
  "/notion": "Notion Sync",
  "/system-health": "System Health",
  "/settings": "Settings",
}

export function TopBar() {
  const pathname = usePathname()
  const unreadCount = useStore((s) => s.unreadCount)
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette)

  const title = pathTitles[pathname] || "Mission Control"

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 border-b border-white/10"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Left: Page title */}
      <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>

      {/* Center: Search trigger */}
      <button
        onClick={toggleCommandPalette}
        className="glass-input flex items-center gap-2 w-72 h-8 px-3 text-sm cursor-pointer"
        style={{ color: "var(--text-muted)" }}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <kbd
          className="text-[10px] font-mono rounded px-1.5 py-0.5"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-muted)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="glass-button p-2 relative" aria-label="Notifications">
          <Bell className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
              style={{
                background: "var(--accent-rose)",
                color: "#fff",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
        <button className="glass-button p-2" aria-label="Settings">
          <Settings className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>
    </header>
  )
}
