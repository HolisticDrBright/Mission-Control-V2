'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Hash, RefreshCw } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  sender: string
  message: string
  channel: string
  metadata: Record<string, unknown>
  read_by: string[]
  created_at: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CHANNELS = ['general', 'outreach', 'seo', 'cashclaw', 'dev', 'alerts']

const SENDER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  brandon: { label: 'Brandon', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  openclaw: { label: 'OpenClaw', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  cowork: { label: 'Cowork', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  atlas: { label: 'Atlas', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  system: { label: 'System', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
  const config = SENDER_CONFIG[msg.sender] || SENDER_CONFIG.system
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: config.color }}
          />
          <span className="text-[10px] font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {time}
          </span>
        </div>

        {/* Bubble */}
        <div
          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={{
            background: isOwn ? 'rgba(59,130,246,0.15)' : config.bg,
            border: `1px solid ${isOwn ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
            color: 'var(--text-primary)',
            borderBottomRightRadius: isOwn ? '4px' : '16px',
            borderBottomLeftRadius: isOwn ? '16px' : '4px',
          }}
        >
          <p className="whitespace-pre-wrap break-words">{msg.message}</p>

          {/* Metadata badges */}
          {msg.metadata && Object.keys(msg.metadata).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {typeof msg.metadata.task_id === 'string' && (
                <a
                  href={`/tasks/${msg.metadata.task_id}`}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}
                >
                  Task
                </a>
              )}
              {typeof msg.metadata.lead_id === 'string' && (
                <a
                  href={`/outreach/leads/${msg.metadata.lead_id}`}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)' }}
                >
                  Lead
                </a>
              )}
              {typeof msg.metadata.url === 'string' && (
                <a
                  href={msg.metadata.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent-purple)' }}
                >
                  Link
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chat page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channel, setChannel] = useState('general')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?channel=${channel}&limit=100`)
      if (res.ok) {
        const json = await res.json()
        setMessages(json.data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [channel])

  useEffect(() => {
    setLoading(true)
    fetchMessages()
  }, [fetchMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Supabase Realtime subscription
  useEffect(() => {
    try {
      const supabase = createClient()
      const sub = supabase
        .channel(`chat-${channel}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mc_chat_messages',
            filter: `channel=eq.${channel}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage
            setMessages((prev) => {
              // Dedupe
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(sub)
      }
    } catch {
      // Supabase not available
    }
  }, [channel])

  // Send message
  const handleSend = async () => {
    const text = input.trim()
    if (!text) return

    setSending(true)
    setInput('')

    // Optimistic update
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'brandon',
      message: text,
      channel,
      metadata: {},
      read_by: ['brandon'],
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'brandon', message: text, channel }),
      })

      if (res.ok) {
        const json = await res.json()
        // Replace optimistic with real
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? json.data : m))
        )
      }
    } catch {
      // Keep optimistic message
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div
        className="shrink-0 px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Chat
          </h1>
          {/* Channel tabs */}
          <div className="flex gap-1">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all ${
                  channel === ch ? 'glass-button-primary' : ''
                }`}
                style={{
                  background: channel === ch ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: channel === ch ? 'var(--accent-blue)' : 'var(--text-muted)',
                }}
                onClick={() => setChannel(ch)}
              >
                <Hash size={10} />
                {ch}
              </button>
            ))}
          </div>
        </div>
        <button className="glass-button p-2" onClick={fetchMessages} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Hash size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
              No messages in #{channel} yet.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Start a conversation or wait for agents to post updates.
            </p>
          </div>
        ) : (
          <>
            {/* Date separators + messages */}
            {messages.map((msg, i) => {
              const prevMsg = messages[i - 1]
              const showDate =
                !prevMsg ||
                new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <span className="text-[10px] px-2" style={{ color: 'var(--text-muted)' }}>
                        {new Date(msg.created_at).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                  )}
                  <MessageBubble msg={msg} isOwn={msg.sender === 'brandon'} />
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Input area */}
      <div
        className="shrink-0 px-6 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              className="glass-input w-full text-sm resize-none"
              rows={2}
              placeholder={`Message #${channel}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              style={{ minHeight: 44 }}
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
          <button
            className="glass-button-primary glass-button p-3 shrink-0"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{ marginBottom: 18 }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
