'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'
import { createClient } from '@/lib/supabase/client'

function safeFetch(
  table: string,
  setter: (data: any[]) => void,
  opts?: { order?: { column: string; ascending?: boolean }; limit?: number },
) {
  try {
    const supabase = createClient()
    let query = supabase.from(table).select('*')

    if (opts?.order) {
      query = query.order(opts.order.column, { ascending: opts.order.ascending ?? false })
    }
    if (opts?.limit) {
      query = query.limit(opts.limit)
    }

    query.then(
      ({ data, error }) => {
        if (error) {
          console.error(`[use-data] ${table} query error:`, error.message)
          setter([]) // Set empty default on error
          return
        }
        setter(data || [])
      },
      (err) => {
        console.error(`[use-data] ${table} fetch failed:`, err)
        setter([]) // Set empty default on network failure
      },
    )
  } catch (err) {
    console.error(`[use-data] ${table} client error:`, err)
    setter([]) // Set empty default if client creation fails
  }
}

export function useProjects() {
  const setProjects = useStore((s) => s.setProjects)
  useEffect(() => {
    safeFetch('projects', setProjects, { order: { column: 'updated_at' } })
  }, [setProjects])
}

export function useAgents() {
  const setAgents = useStore((s) => s.setAgents)
  useEffect(() => {
    safeFetch('agents', setAgents, { order: { column: 'updated_at' } })
  }, [setAgents])
}

export function useTasks() {
  const setTasks = useStore((s) => s.setTasks)
  useEffect(() => {
    safeFetch('tasks', setTasks, { order: { column: 'created_at' } })
  }, [setTasks])
}

export function useScheduledJobs() {
  const setJobs = useStore((s) => s.setJobs)
  useEffect(() => {
    safeFetch('scheduled_jobs', setJobs, { order: { column: 'next_run_at', ascending: true } })
  }, [setJobs])
}

export function useInboxMessages() {
  const setMessages = useStore((s) => s.setMessages)
  useEffect(() => {
    safeFetch('inbox_messages', setMessages, { order: { column: 'created_at' } })
  }, [setMessages])
}

export function useActivityLog() {
  const addActivity = useStore((s) => s.addActivity)
  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50)
        .then(
          ({ data, error }) => {
            if (error) {
              console.error('[use-data] activity_log query error:', error.message)
              return
            }
            if (data) data.reverse().forEach(addActivity)
          },
          (err) => {
            console.error('[use-data] activity_log fetch failed:', err)
          },
        )
    } catch (err) {
      console.error('[use-data] activity_log client error:', err)
    }
  }, [addActivity])
}

export function useDashboardData() {
  useProjects()
  useAgents()
  useTasks()
  useScheduledJobs()
  useInboxMessages()
  useActivityLog()
}
