'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/store'
import type { ActivityLogEntry, Agent, Task, InboxMessage } from '@/lib/types'

export function useRealtimeActivityLog() {
  const addActivity = useStore((s) => s.addActivity)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('activity_log_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          addActivity(payload.new as ActivityLogEntry)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [addActivity])
}

export function useRealtimeAgents() {
  const agents = useStore((s) => s.agents)
  const setAgents = useStore((s) => s.setAgents)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('agents_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Agent
            setAgents(agents.map((a) => a.id === updated.id ? updated : a))
          } else if (payload.eventType === 'INSERT') {
            setAgents([...agents, payload.new as Agent])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [agents, setAgents])
}

export function useRealtimeTasks() {
  const tasks = useStore((s) => s.tasks)
  const setTasks = useStore((s) => s.setTasks)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task
            setTasks(tasks.map((t) => t.id === updated.id ? updated : t))
          } else if (payload.eventType === 'INSERT') {
            setTasks([...tasks, payload.new as Task])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tasks, setTasks])
}

export function useRealtimeInbox() {
  const messages = useStore((s) => s.inboxMessages)
  const setMessages = useStore((s) => s.setMessages)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('inbox_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inbox_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages([payload.new as InboxMessage, ...messages])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as InboxMessage
            setMessages(messages.map((m) => m.id === updated.id ? updated : m))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [messages, setMessages])
}
