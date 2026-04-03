'use client'

import { useState, useEffect } from 'react'
import { Bot, TrendingUp, DollarSign, Zap } from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  status: 'running' | 'idle' | 'paused'
  total_runs: number
  total_cost_usd: number
  avg_outcome_score: number
  capabilities: string[]
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        setAgents(data.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch agents:', err)
        setLoading(false)
      })
  }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case 'running': return '#10b981'
      case 'idle': return '#6b7280'
      case 'paused': return '#f59e0b'
      default: return '#888'
    }
  }

  const roleColor = (role: string) => {
    switch (role) {
      case 'analyst': return '#3b82f6'
      case 'content': return '#10b981'
      case 'custom': return '#8b5cf6'
      default: return '#f59e0b'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: '#eee' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Agent Fleet</h1>
        <p style={{ color: '#888', marginTop: 8 }}>Loading agents...</p>
      </div>
    )
  }

  const running = agents.filter(a => a.status === 'running').length
  const totalCost = agents.reduce((sum, a) => sum + a.total_cost_usd, 0)
  const avgScore = agents.length > 0 ? (agents.reduce((sum, a) => sum + a.avg_outcome_score, 0) / agents.length).toFixed(0) : '0'

  return (
    <div style={{ padding: 24, color: '#eee', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Agent Fleet</h1>
        <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0' }}>{agents.length} total agents · {running} active</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { icon: Bot, label: 'Total Agents', value: agents.length, color: '#3b82f6' },
          { icon: Zap, label: 'Active', value: running, color: '#10b981' },
          { icon: DollarSign, label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, color: '#f59e0b' },
          { icon: TrendingUp, label: 'Avg Score', value: avgScore, color: '#8b5cf6' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} color={stat.color} />
                <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>{stat.label}</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#eee' }}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Agents Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
        {agents.map(agent => (
          <div key={agent.id} style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#eee' }}>{agent.name}</p>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
                  <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, background: `${roleColor(agent.role)}22`, color: roleColor(agent.role), fontSize: 10, textTransform: 'uppercase' }}>
                    {agent.role}
                  </span>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: 0, color: statusColor(agent.status), textTransform: 'uppercase' }}>
                  {agent.status}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px', textTransform: 'uppercase' }}>Runs</p>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#eee' }}>{agent.total_runs}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px', textTransform: 'uppercase' }}>Cost</p>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#eee' }}>${agent.total_cost_usd.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px', textTransform: 'uppercase' }}>Score</p>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#10b981' }}>{agent.avg_outcome_score}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: '#888', margin: '0 0 2px', textTransform: 'uppercase' }}>Type</p>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#eee' }}>{agent.role}</p>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <p style={{ fontSize: 10, color: '#888', margin: '0 0 6px', textTransform: 'uppercase' }}>Capabilities</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {agent.capabilities.slice(0, 3).map((cap, i) => (
                  <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#aaa' }}>
                    {cap}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#666' }}>
                    +{agent.capabilities.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
          <p>No agents found</p>
        </div>
      )}
    </div>
  )
}
