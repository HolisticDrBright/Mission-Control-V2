'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '@/store'
import type { Agent, ActivityLogEntry } from '@/lib/types'

interface OpenClawEvent {
  type: string
  agent_id?: string
  task_id?: string
  data?: Record<string, unknown>
  timestamp?: string
}

export function useOpenClawGateway() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const setAgents = useStore((s) => s.setAgents)
  const agents = useStore((s) => s.agents)
  const addActivity = useStore((s) => s.addActivity)
  const updateTask = useStore((s) => s.updateTask)

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const parsed: OpenClawEvent = JSON.parse(event.data)

      switch (parsed.type) {
        case 'agent:status_change': {
          if (parsed.agent_id && parsed.data?.status) {
            const status = parsed.data.status as string
            setAgents(
              agents.map((a) =>
                a.openclaw_agent_id === parsed.agent_id
                  ? { ...a, status: status as Agent['status'], updated_at: new Date().toISOString() }
                  : a
              )
            )
          }
          break
        }
        case 'agent:heartbeat': {
          if (parsed.agent_id) {
            setAgents(
              agents.map((a) =>
                a.openclaw_agent_id === parsed.agent_id
                  ? { ...a, heartbeat_at: new Date().toISOString() }
                  : a
              )
            )
          }
          break
        }
        case 'task:complete': {
          if (parsed.task_id) {
            updateTask(parsed.task_id, {
              kanban_status: 'done',
              completed_at: new Date().toISOString(),
            })
          }
          break
        }
        case 'task:failed': {
          if (parsed.task_id) {
            updateTask(parsed.task_id, { kanban_status: 'blocked' })
          }
          break
        }
        case 'task:log': {
          // Stream log to activity feed
          const logEntry: ActivityLogEntry = {
            id: crypto.randomUUID(),
            event_type: 'task_log',
            entity_type: 'task',
            entity_id: parsed.task_id || '',
            description: String(parsed.data?.message || 'Agent log'),
            metadata: parsed.data || null,
            created_at: new Date().toISOString(),
          }
          addActivity(logEntry)
          break
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }, [agents, setAgents, addActivity, updateTask])

  const connect = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_URL
    if (!url) return

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        const token = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }))
        }
      }

      ws.onmessage = handleMessage

      ws.onclose = () => {
        // Auto-reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      // Connection failed, retry
      reconnectTimeoutRef.current = setTimeout(connect, 5000)
    }
  }, [handleMessage])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect: () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    },
  }
}
