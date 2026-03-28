"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { LiveFeed } from "@/components/layout/LiveFeed"
import { useRealtimeActivityLog, useRealtimeAgents, useRealtimeTasks, useRealtimeInbox } from "@/lib/hooks/use-realtime"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  // Subscribe to real-time updates
  useRealtimeActivityLog()
  useRealtimeAgents()
  useRealtimeTasks()
  useRealtimeInbox()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  )
}
