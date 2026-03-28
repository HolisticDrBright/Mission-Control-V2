'use client'

import { useState } from 'react'
import {
  Mail,
  MailOpen,
  ClipboardList,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  XCircle,
  Check,
  X,
  SquareSlash,
} from 'lucide-react'
import { useStore } from '@/store'
import GlassCard from '@/components/ui/GlassCard'
import AgentAvatar from '@/components/ui/AgentAvatar'
import type { InboxMessage } from '@/lib/types'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  delegation: { icon: ClipboardList, color: 'var(--accent-blue)', label: 'Delegation' },
  report: { icon: BarChart3, color: 'var(--accent-emerald)', label: 'Report' },
  question: { icon: HelpCircle, color: 'var(--accent-purple)', label: 'Question' },
  approval_request: { icon: AlertTriangle, color: 'var(--accent-amber)', label: 'Approval' },
  failure_report: { icon: XCircle, color: 'var(--accent-rose)', label: 'Failure' },
}

const FILTER_OPTIONS = ['all', 'unread', 'action_required'] as const

export default function InboxPage() {
  const messages = useStore((s) => s.inboxMessages)
  const agents = useStore((s) => s.agents)
  const markRead = useStore((s) => s.markRead)
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]>('all')
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null)

  const filtered = messages.filter((m) => {
    if (filter === 'unread') return m.status === 'unread'
    if (filter === 'action_required') return m.requires_action && m.status !== 'actioned'
    return true
  })

  const unreadCount = messages.filter((m) => m.status === 'unread').length

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Inbox
          </h2>
          {unreadCount > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--accent-blue)' }}
            >
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              className="px-3 py-1 rounded-lg text-xs capitalize transition-all"
              style={{
                background: filter === f ? 'var(--glass-bg-hover)' : 'transparent',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onClick={() => setFilter(f)}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Message List */}
        <div className="flex-1 space-y-2">
          {filtered.length === 0 ? (
            <GlassCard className="p-8 flex flex-col items-center">
              <Mail size={40} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                {filter === 'all' ? 'No messages yet' : `No ${filter.replace('_', ' ')} messages`}
              </p>
            </GlassCard>
          ) : (
            filtered.map((msg) => {
              const config = TYPE_CONFIG[msg.type] || TYPE_CONFIG.report
              const Icon = config.icon
              const agent = agents.find((a) => a.id === msg.from_agent_id)
              const isSelected = selectedMessage?.id === msg.id

              return (
                <GlassCard
                  key={msg.id}
                  className={`p-4 cursor-pointer ${isSelected ? '!border-[var(--accent-blue)]' : ''}`}
                  onClick={() => {
                    setSelectedMessage(msg)
                    if (msg.status === 'unread') markRead(msg.id)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${config.color}22`, color: config.color }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm ${msg.status === 'unread' ? 'font-semibold' : 'font-medium'}`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {msg.subject}
                        </p>
                        {msg.requires_action && msg.status !== 'actioned' && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-md font-medium uppercase"
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              color: 'var(--accent-amber)',
                            }}
                          >
                            Action Required
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {agent && (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            From: {agent.name}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(msg.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {msg.body}
                      </p>
                    </div>
                    {msg.status === 'unread' && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-2"
                        style={{ background: 'var(--accent-blue)' }}
                      />
                    )}
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>

        {/* Detail Panel */}
        {selectedMessage && (
          <div className="w-96 shrink-0">
            <GlassCard className="p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-md uppercase font-medium"
                  style={{
                    background: `${TYPE_CONFIG[selectedMessage.type]?.color || 'var(--text-muted)'}22`,
                    color: TYPE_CONFIG[selectedMessage.type]?.color || 'var(--text-muted)',
                  }}
                >
                  {TYPE_CONFIG[selectedMessage.type]?.label || selectedMessage.type}
                </span>
                <button
                  className="glass-button p-1"
                  onClick={() => setSelectedMessage(null)}
                >
                  <X size={14} />
                </button>
              </div>

              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {selectedMessage.subject}
              </h3>

              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                {selectedMessage.body}
              </p>

              {selectedMessage.requires_action &&
                selectedMessage.status !== 'actioned' &&
                selectedMessage.action_options && (
                  <div className="flex gap-2 mt-4">
                    {(selectedMessage.action_options as Array<{ label: string; value: string }>).map(
                      (option) => (
                        <button
                          key={option.value}
                          className={`glass-button text-sm flex items-center gap-1 ${
                            option.value === 'approve' ? 'glass-button-primary' : ''
                          }`}
                        >
                          {option.value === 'approve' ? (
                            <Check size={14} />
                          ) : option.value === 'reject' ? (
                            <X size={14} />
                          ) : null}
                          {option.label}
                        </button>
                      )
                    )}
                  </div>
                )}

              {selectedMessage.status === 'actioned' && (
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    color: 'var(--accent-emerald)',
                  }}
                >
                  Action taken: {selectedMessage.action_taken}
                  {selectedMessage.actioned_at && (
                    <span className="ml-2" style={{ color: 'var(--text-muted)' }}>
                      {new Date(selectedMessage.actioned_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}
