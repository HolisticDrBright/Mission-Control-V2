'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'

// Fetch from REST API endpoints instead of Supabase direct.
// This avoids anon key issues and uses the server-side service role key.

function apiFetch(
  url: string,
  setter: (data: any[]) => void,
  dataPath?: string, // e.g. 'data.blog_posts' or just 'data'
) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    })
    .then(json => {
      let result = json
      // Navigate the data path (e.g. json.data or json.data.blog_posts)
      if (dataPath) {
        for (const key of dataPath.split('.')) {
          result = result?.[key]
        }
      }
      setter(Array.isArray(result) ? result : [])
    })
    .catch(err => {
      console.error(`[use-data] ${url} failed:`, err)
      setter([])
    })
}

export function useProjects() {
  const setProjects = useStore((s) => s.setProjects)
  useEffect(() => {
    apiFetch('/api/projects', setProjects, 'data')
  }, [setProjects])
}

export function useAgents() {
  const setAgents = useStore((s) => s.setAgents)
  useEffect(() => {
    apiFetch('/api/agents', setAgents, 'data')
  }, [setAgents])
}

export function useTasks() {
  const setTasks = useStore((s) => s.setTasks)
  useEffect(() => {
    apiFetch('/api/tasks', setTasks, 'data')
  }, [setTasks])
}

export function useScheduledJobs() {
  const setJobs = useStore((s) => s.setJobs)
  useEffect(() => {
    apiFetch('/api/scheduler', setJobs, 'data')
  }, [setJobs])
}

export function useInboxMessages() {
  const setMessages = useStore((s) => s.setMessages)
  useEffect(() => {
    apiFetch('/api/inbox', setMessages, 'data')
  }, [setMessages])
}

export function useActivityLog() {
  const addActivity = useStore((s) => s.addActivity)
  useEffect(() => {
    fetch('/api/mission-state?section=alerts')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        const items = json?.data?.alerts || json?.data || []
        if (Array.isArray(items)) {
          items.reverse().forEach(addActivity)
        }
      })
      .catch(err => console.error('[use-data] activity failed:', err))
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
