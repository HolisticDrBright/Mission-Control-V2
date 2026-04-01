"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import { Bell, Settings, Search, Check, MessageCircle, Users, UserPlus, FileText, AlertTriangle, Info, X } from "lucide-react"
import { useStore } from "@/store"
import { createClient } from "@/lib/supabase/client"

const pathTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/projects/new": "Create Project",
  "/tasks": "Tasks",
  "/tasks/new": "Create Task",
  "/agents": "Agents",
  "/scheduler": "Scheduler",
  "/inbox": "Inbox",
  "/viral-reel": "Viral Reel",
  "/seo/holistic-dr-bright": "HolisticDrBright SEO",
  "/seo/dspiked": "DSpiked SEO",
  "/va-tasks": "VA Tasks",
  "/ml-ops": "ML Ops",
  "/notion": "Notion Sync",
  "/seo-automation": "SEO Automation",
  "/outreach": "Cold Outreach",
  "/outreach/leads": "Outreach Leads",
  "/outreach/leads/new": "Add Lead",
  "/outreach/templates": "Outreach Templates",
  "/outreach/signals": "Outreach Signals",
  "/outreach/replies": "Outreach Replies",
  "/cashclaw": "CashClaw",
  "/chat": "Chat",
  "/system-health": "System Health",
  "/blog": "Blog Posts",
  "/alerts": "Alerts",
  "/activity": "Activity Log",
  "/skills": "Skills",
  "/settings": "Settings",
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  link: string | null
  read: boolean
  created_at: string
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  chat: MessageCircle,
  task: Users,
  lead: UserPlus,
  template: FileText,
  alert: AlertTriangle,
  info: Info,
}

const TYPE_COLORS: Record<string, string> = {
  chat: "var(--accent-purple)",
  task: "var(--accent-blue)",
  lead: "var(--accent-emerald)",
  template: "var(--accent-cyan)",
  alert: "var(--accent-amber)",
  info: "var(--text-secondary)",
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function TopBar() {
  const pathname = usePathname()
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const title = pathTitles[pathname] || "Mission Control"

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?recipient=brandon&limit=20")
      if (res.ok) {
        const json = await res.json()
        setNotifications(json.data || [])
        setUnreadCount(json.unread_count || 0)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Supabase Realtime for instant notifications
  useEffect(() => {
    try {
      const supabase = createClient()
      const channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "mc_notifications", filter: "recipient=eq.brandon" },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
            setUnreadCount((prev) => prev + 1)
          },
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch {
      // Supabase not available
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showDropdown])

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: "brandon" }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const handleNotifClick = (notif: Notification) => {
    if (!notif.read) markRead(notif.id)
    if (notif.link) window.location.href = notif.link
    setShowDropdown(false)
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 border-b border-white/10"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>

      <button
        onClick={toggleCommandPalette}
        className="glass-input flex items-center gap-2 w-72 h-8 px-3 text-sm cursor-pointer"
        style={{ color: "var(--text-muted)" }}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] font-mono rounded px-1.5 py-0.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--glass-border)", color: "var(--text-muted)" }}>
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="glass-button p-2 relative"
            aria-label="Notifications"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell className="w-4 h-4" style={{ color: showDropdown ? "var(--accent-blue)" : "var(--text-secondary)" }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
                style={{ background: "var(--accent-rose)", color: "#fff" }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-96 max-h-[480px] overflow-hidden rounded-xl z-50"
              style={{
                background: "rgba(12, 16, 28, 0.95)",
                backdropFilter: "blur(40px)",
                border: "1px solid var(--glass-border-strong)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)" }}>
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      className="text-[10px] px-2 py-1 rounded glass-button flex items-center gap-1"
                      onClick={markAllRead}
                    >
                      <Check size={10} />
                      Mark all read
                    </button>
                  )}
                  <button className="glass-button p-1" onClick={() => setShowDropdown(false)}>
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Notifications list */}
              <div className="overflow-y-auto max-h-[400px]">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Bell size={24} style={{ color: "var(--text-muted)" }} />
                    <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const Icon = TYPE_ICONS[notif.type] || Info
                    const color = TYPE_COLORS[notif.type] || "var(--text-secondary)"

                    return (
                      <div
                        key={notif.id}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                        style={{
                          background: notif.read ? "transparent" : "rgba(59,130,246,0.04)",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                        onClick={() => handleNotifClick(notif)}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--glass-bg-hover)" }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = notif.read ? "transparent" : "rgba(59,130,246,0.04)" }}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                        >
                          <Icon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs ${notif.read ? "font-normal" : "font-semibold"}`} style={{ color: "var(--text-primary)" }}>
                            {notif.title}
                          </p>
                          {notif.message && (
                            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                              {notif.message}
                            </p>
                          )}
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "var(--accent-blue)" }} />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <a href="/settings" className="glass-button p-2" aria-label="Settings">
          <Settings className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        </a>
      </div>
    </header>
  )
}
