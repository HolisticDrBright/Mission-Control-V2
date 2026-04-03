"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { useRealtimeActivityLog, useRealtimeAgents, useRealtimeTasks, useRealtimeInbox } from "@/lib/hooks/use-realtime"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useRealtimeActivityLog()
  useRealtimeAgents()
  useRealtimeTasks()
  useRealtimeInbox()

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="mobile-overlay md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, shown on desktop */}
      <div className={`hidden md:block`}>
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <div
        className={`md:hidden fixed top-0 bottom-0 z-50 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  )
}
