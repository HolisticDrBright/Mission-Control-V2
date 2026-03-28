'use client'

import { useEffect } from 'react'
import { useStore } from '@/store'
import { createClient } from '@/lib/supabase/client'

export function useProjects() {
  const setProjects = useStore((s) => s.setProjects)
  useEffect(() => {
    createClient().from('projects').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setProjects(data) }, () => {})
  }, [setProjects])
}

export function useAgents() {
  const setAgents = useStore((s) => s.setAgents)
  useEffect(() => {
    createClient().from('agents').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setAgents(data) }, () => {})
  }, [setAgents])
}

export function useTasks() {
  const setTasks = useStore((s) => s.setTasks)
  useEffect(() => {
    createClient().from('tasks').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTasks(data) }, () => {})
  }, [setTasks])
}

export function useScheduledJobs() {
  const setJobs = useStore((s) => s.setJobs)
  useEffect(() => {
    createClient().from('scheduled_jobs').select('*').order('next_run_at')
      .then(({ data }) => { if (data) setJobs(data) }, () => {})
  }, [setJobs])
}

export function useInboxMessages() {
  const setMessages = useStore((s) => s.setMessages)
  useEffect(() => {
    createClient().from('inbox_messages').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setMessages(data) }, () => {})
  }, [setMessages])
}

export function useActivityLog() {
  const addActivity = useStore((s) => s.addActivity)
  useEffect(() => {
    createClient().from('activity_log').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) data.reverse().forEach(addActivity) }, () => {})
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
