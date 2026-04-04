"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bot,
  Calendar,
  Mail,
  Video,
  Leaf,
  Zap,
  Users,
  Brain,
  RefreshCw,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  HeartPulse,
  Grab,
  Search,
  Target,
  MessageCircle,
  Puzzle,
  AlertTriangle,
  Activity,
  FileText,
  Radio,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/store"
import { LiveIndicator } from "@/components/ui/LiveIndicator"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const unreadCount = useStore((s) => s.unreadCount)
  const agents = useStore((s) => s.agents)
  const systemStatus = 'healthy' as const
  const openClawConnected = false
  const activeAgentCount = agents.filter((a) => a.status === 'running').length

  const sections: NavSection[] = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Projects", href: "/projects", icon: FolderKanban },
        { label: "Tasks", href: "/tasks", icon: CheckSquare },
        { label: "Agents", href: "/agents", icon: Bot },
        { label: "Scheduler", href: "/scheduler", icon: Calendar },
        { label: "Inbox", href: "/inbox", icon: Mail, badge: unreadCount || undefined },
      ],
    },
    {
      title: "Automation",
      items: [
        { label: "SEO Automation", href: "/seo-automation", icon: Search },
        { label: "Cold Outreach", href: "/outreach", icon: Target },
        { label: "  Leads", href: "/outreach/leads", icon: Users },
        { label: "  Templates", href: "/outreach/templates", icon: FileText },
        { label: "  Signals", href: "/outreach/signals", icon: Radio },
        { label: "  Replies", href: "/outreach/replies", icon: MessageSquare },
      ],
    },
    {
      title: "Content",
      items: [
        { label: "Viral Reel", href: "/viral-reel", icon: Video },
        { label: "HolisticDrBright SEO", href: "/seo/holistic-dr-bright", icon: Leaf },
        { label: "DSpiked SEO", href: "/seo/dspiked", icon: Zap },
        { label: "Blog Posts", href: "/blog", icon: FileText },
      ],
    },
    {
      title: "Revenue",
      items: [
        { label: "CashClaw", href: "/cashclaw", icon: Grab },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Chat", href: "/chat", icon: MessageCircle },
        { label: "VA Tasks", href: "/va-tasks", icon: Users },
        { label: "ML Ops", href: "/ml-ops", icon: Brain },
        { label: "Notion Sync", href: "/notion", icon: RefreshCw },
        { label: "Alerts", href: "/alerts", icon: AlertTriangle },
        { label: "Activity", href: "/activity", icon: Activity },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Skills", href: "/skills", icon: Puzzle },
        { label: "System Health", href: "/system-health", icon: HeartPulse },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  ]

  return (
    <aside
      className={cn(
        "glass-sidebar flex flex-col h-screen sticky top-0 transition-all duration-300 z-40",
        sidebarCollapsed ? "w-16" : "w-60",
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-white/10", sidebarCollapsed && "justify-center")}>
        {!sidebarCollapsed && (
          <span className="text-sm font-bold tracking-wider" style={{ color: "var(--accent-blue)" }}>
            MISSION CTRL
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="glass-button p-1.5 ml-auto"
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          ) : (
            <PanelLeftClose className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            {!sidebarCollapsed && (
              <p className="text-[10px] uppercase tracking-widest px-3 mb-1" style={{ color: "var(--text-muted)" }}>
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 relative group",
                    sidebarCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-[var(--glass-bg-active)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ backgroundColor: "var(--accent-blue)", boxShadow: "0 0 8px var(--accent-blue)" }}
                    />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {!sidebarCollapsed && item.badge && item.badge > 0 && (
                    <span
                      className="ml-auto text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        color: "var(--accent-blue)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  {/* Tooltip for collapsed */}
                  {sidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 glass-card">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div className={cn("border-t border-white/10 p-3 space-y-2", sidebarCollapsed && "px-2")}>
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "gap-2")}>
          <LiveIndicator status={systemStatus} label={sidebarCollapsed ? undefined : "System"} />
        </div>
        <div className={cn("flex items-center", sidebarCollapsed ? "justify-center" : "gap-2")}>
          <LiveIndicator
            status={openClawConnected ? "healthy" : "offline"}
            label={sidebarCollapsed ? undefined : "OpenClaw"}
          />
        </div>
        {!sidebarCollapsed && (
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {activeAgentCount} agents active
          </p>
        )}
      </div>
    </aside>
  )
}
