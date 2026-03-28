'use client'

import { Settings, Database, Bot, Globe, Key, Bell } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'

const SETTINGS_SECTIONS = [
  {
    title: 'Database',
    icon: Database,
    fields: [
      { label: 'Supabase URL', key: 'NEXT_PUBLIC_SUPABASE_URL', type: 'text' },
      { label: 'Supabase Anon Key', key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', type: 'password' },
    ],
  },
  {
    title: 'OpenClaw',
    icon: Bot,
    fields: [
      { label: 'Gateway URL', key: 'OPENCLAW_GATEWAY_URL', type: 'text' },
      { label: 'Gateway Token', key: 'OPENCLAW_GATEWAY_TOKEN', type: 'password' },
    ],
  },
  {
    title: 'Notion',
    icon: Globe,
    fields: [
      { label: 'API Token', key: 'NOTION_API_TOKEN', type: 'password' },
      { label: 'Tasks Database ID', key: 'NOTION_TASKS_DATABASE_ID', type: 'text' },
    ],
  },
  {
    title: 'API Keys',
    icon: Key,
    fields: [
      { label: 'HeyGen API Key', key: 'HEYGEN_API_KEY', type: 'password' },
      { label: 'ElevenLabs API Key', key: 'ELEVENLABS_API_KEY', type: 'password' },
      { label: 'Pexels API Key', key: 'PEXELS_API_KEY', type: 'password' },
      { label: 'GenViral API Key', key: 'GENVIRAL_API_KEY', type: 'password' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[900px] mx-auto">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h2>

      {SETTINGS_SECTIONS.map((section) => (
        <GlassCard key={section.title} className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <section.icon size={16} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {section.title}
            </h3>
          </div>
          <div className="space-y-3">
            {section.fields.map((field) => (
              <div key={field.key}>
                <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  className="glass-input w-full text-sm"
                  placeholder={field.key}
                  readOnly
                />
              </div>
            ))}
          </div>
        </GlassCard>
      ))}

      <GlassCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} style={{ color: 'var(--accent-blue)' }} />
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Daemon Configuration
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Concurrency Limit</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Max simultaneous agent sessions
              </p>
            </div>
            <input
              type="number"
              className="glass-input w-20 text-sm text-center"
              defaultValue={3}
              min={1}
              max={10}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Poll Interval</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                How often the daemon checks for work (seconds)
              </p>
            </div>
            <input
              type="number"
              className="glass-input w-20 text-sm text-center"
              defaultValue={30}
              min={10}
              max={300}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
