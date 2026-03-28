import type { Agent } from '@/lib/types'
import type { OpenClawConfig, OpenClawAgentConfig } from './discovery'

export interface OpenClawEvent {
  type: string
  payload: unknown
  timestamp: string
}

export interface TaskDispatchRequest {
  task_id: string
  agent_id: string
  payload?: Record<string, unknown>
  input?: Record<string, unknown>
  timeout_ms?: number
}

export interface TaskLogEntry {
  task_id: string
  agent_id: string
  message: string
  level: 'info' | 'warn' | 'error' | 'debug'
  timestamp: string
  metadata?: Record<string, unknown>
}

type EventHandler = (event: OpenClawEvent) => void

interface GatewayOptions {
  reconnectIntervalMs?: number
  maxReconnectAttempts?: number
  heartbeatIntervalMs?: number
}

const DEFAULT_OPTIONS: Required<GatewayOptions> = {
  reconnectIntervalMs: 3000,
  maxReconnectAttempts: 10,
  heartbeatIntervalMs: 30000,
}

export class OpenClawGateway {
  private ws: WebSocket | null = null
  private config: OpenClawConfig
  private options: Required<GatewayOptions>
  private eventHandlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private intentionalClose = false

  constructor(options?: GatewayOptions) {
    this.config = {
      gateway_url: process.env.OPENCLAW_GATEWAY_URL ?? 'ws://localhost:9800',
      api_key: process.env.OPENCLAW_API_KEY ?? '',
      workspace_id: process.env.OPENCLAW_WORKSPACE_ID ?? 'default',
      agents: [],
    }
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.intentionalClose = false
      this.reconnectAttempts = 0

      try {
        const url = new URL(this.config.gateway_url)
        url.searchParams.set('workspace', this.config.workspace_id)
        url.searchParams.set('token', this.config.api_key)

        this.ws = new WebSocket(url.toString())

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event: MessageEvent) => {
          try {
            const parsed: OpenClawEvent = JSON.parse(
              typeof event.data === 'string' ? event.data : ''
            )
            this.dispatchEvent(parsed)
          } catch {
            // Ignore malformed messages
          }
        }

        this.ws.onclose = () => {
          this.stopHeartbeat()
          if (!this.intentionalClose) {
            this.attemptReconnect()
          }
        }

        this.ws.onerror = (err) => {
          if (this.reconnectAttempts === 0) {
            reject(new Error(`WebSocket connection failed: ${String(err)}`))
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  disconnect(): void {
    this.intentionalClose = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
  }

  async dispatchTask(request: TaskDispatchRequest): Promise<void> {
    this.ensureConnected()
    const message = JSON.stringify({
      action: 'dispatch_task',
      payload: request,
      timestamp: new Date().toISOString(),
    })
    this.ws!.send(message)
  }

  streamLogs(
    taskId: string,
    callback: (entry: TaskLogEntry) => void
  ): () => void {
    const handler: EventHandler = (event) => {
      if (
        event.type === 'task:log' &&
        (event.payload as Record<string, unknown>).task_id === taskId
      ) {
        callback({
          task_id: taskId,
          agent_id: (event.payload as Record<string, unknown>).agent_id as string,
          message: (event.payload as Record<string, unknown>).message as string,
          level: ((event.payload as Record<string, unknown>).level as TaskLogEntry['level']) ?? 'info',
          timestamp: event.timestamp,
          metadata: (event.payload as Record<string, unknown>).metadata as Record<string, unknown> | undefined,
        })
      }
    }
    this.on('task:log', handler)

    this.ensureConnected()
    this.ws!.send(
      JSON.stringify({
        action: 'subscribe_logs',
        payload: { task_id: taskId },
        timestamp: new Date().toISOString(),
      })
    )

    return () => {
      this.off('task:log', handler)
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            action: 'unsubscribe_logs',
            payload: { task_id: taskId },
            timestamp: new Date().toISOString(),
          })
        )
      }
    }
  }

  async getAgents(): Promise<Agent[]> {
    this.ensureConnected()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('getAgents timed out after 10s'))
      }, 10000)

      const handler: EventHandler = (event) => {
        if (event.type === 'agent:status_change' || (event.payload as Record<string, unknown>).action === 'agents_list') {
          clearTimeout(timeout)
          this.off('agent:status_change', handler)
          const agents = ((event.payload as Record<string, unknown>).agents as Agent[]) ?? []
          resolve(agents)
        }
      }

      this.on('agent:status_change', handler)
      this.ws!.send(
        JSON.stringify({
          action: 'list_agents',
          payload: {},
          timestamp: new Date().toISOString(),
        })
      )
    })
  }

  async importAgent(agentConfig: OpenClawAgentConfig): Promise<Agent> {
    this.ensureConnected()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('importAgent timed out after 10s'))
      }, 10000)

      const handler: EventHandler = (event) => {
        const payload = event.payload as Record<string, unknown>
        if (
          event.type === 'agent:status_change' &&
          payload.agent_id === agentConfig.id
        ) {
          clearTimeout(timeout)
          this.off('agent:status_change', handler)
          resolve(payload.agent as Agent)
        }
      }

      this.on('agent:status_change', handler)
      this.ws!.send(
        JSON.stringify({
          action: 'import_agent',
          payload: agentConfig,
          timestamp: new Date().toISOString(),
        })
      )
    })
  }

  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)
  }

  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  private dispatchEvent(event: OpenClawEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch {
          // Don't let a bad handler crash the event loop
        }
      })
    }

    const allHandlers = this.eventHandlers.get('*')
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(event)
        } catch {
          // Swallow
        }
      })
    }
  }

  private ensureConnected(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('OpenClaw gateway is not connected')
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.dispatchEvent({
        type: 'agent:status_change',
        payload: {
          action: 'reconnect_failed',
          message: `Exceeded max reconnect attempts (${this.options.maxReconnectAttempts})`,
        },
        timestamp: new Date().toISOString(),
      })
      return
    }

    this.reconnectAttempts++
    const delay = this.options.reconnectIntervalMs * Math.pow(1.5, this.reconnectAttempts - 1)

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // connect will call attemptReconnect via onclose
      })
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            action: 'heartbeat',
            payload: { workspace_id: this.config.workspace_id },
            timestamp: new Date().toISOString(),
          })
        )
      }
    }, this.options.heartbeatIntervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}
