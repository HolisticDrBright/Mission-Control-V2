'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store'
import type { ActivityLogEntry, Agent, Task, InboxMessage } from '@/lib/types'

// Only subscribe if Supabase URL looks real (not placeholder)
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!url && !url.includes('placeholder') && !url.includes('localhost:54321')
}

export function useRealtimeActivityLog() {
  const addActivity = useStore((s) => s.addActivity)

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    try {
      const supabase = createClient()
      const channel = supabase
        .channel('activity_log_changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity_log' },
          (payload) => { addActivity(payload.new as ActivityLogEntry) }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch { /* Supabase not available */ }
  }, [addActivity])
}

export function useRealtimeAgents() {
  const setAgents = useStore((s) => s.setAgents)
  const agentsRef = useRef(useStore.getState().agents)

  useEffect(() => {
    return useStore.subscribe((state) => { agentsRef.current = state.agents })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    try {
      const supabase = createClient()
      const channel = supabase
        .channel('agents_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'agents' },
          (payload) => {
            const current = agentsRef.current
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Agent
              setAgents(current.map((a) => a.id === updated.id ? updated : a))
            } else if (payload.eventType === 'INSERT') {
              setAgents([...current, payload.new as Agent])
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch { /* Supabase not available */ }
  }, [setAgents])
}

export function useRealtimeTasks() {
  const setTasks = useStore((s) => s.setTasks)
  const tasksRef = useRef(useStore.getState().tasks)

  useEffect(() => {
    return useStore.subscribe((state) => { tasksRef.current = state.tasks })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    try {
      const supabase = createClient()
      const channel = supabase
        .channel('tasks_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            const current = tasksRef.current
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Task
              setTasks(current.map((t) => t.id === updated.id ? updated : t))
            } else if (payload.eventType === 'INSERT') {
              setTasks([...current, payload.new as Task])
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch { /* Supabase not available */ }
  }, [setTasks])
}

export function useRealtimeInbox() {
  const setMessages = useStore((s) => s.setMessages)
  const messagesRef = useRef(useStore.getState().inboxMessages)

  useEffect(() => {
    return useStore.subscribe((state) => { messagesRef.current = state.inboxMessages })
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    try {
      const supabase = createClient()
      const channel = supabase
        .channel('inbox_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inbox_messages' },
          (payload) => {
            const current = messagesRef.current
            if (payload.eventType === 'INSERT') {
              setMessages([payload.new as InboxMessage, ...current])
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as InboxMessage
              setMessages(current.map((m) => m.id === updated.id ? updated : m))
            }
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    } catch { /* Supabase not available */ }
  }, [setMessages])
}
