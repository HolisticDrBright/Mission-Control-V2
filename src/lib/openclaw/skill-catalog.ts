/**
 * Static catalog of OpenClaw skills with category mapping.
 *
 * This is the source of truth for categories and serves as a fallback when
 * the filesystem at OPENCLAW_SKILLS_DIR is not available. Descriptions are
 * populated dynamically from each skill's SKILL.md when the filesystem can
 * be read; otherwise the short description below is used.
 */

export type SkillCategory =
  | 'Communication'
  | 'Media'
  | 'Productivity'
  | 'Development'
  | 'AI & Models'
  | 'Home & IoT'
  | 'Security'
  | 'Shopping'
  | 'Travel & Weather'
  | 'Content & SEO'
  | 'System'

export interface SkillCatalogEntry {
  name: string
  category: SkillCategory
  description: string
}

export const SKILL_CATALOG: SkillCatalogEntry[] = [
  // Security
  { name: '1password', category: 'Security', description: '1Password vault access for secrets and credentials.' },
  { name: 'healthcheck', category: 'Security', description: 'System and service health monitoring checks.' },

  // Productivity / Notes
  { name: 'apple-notes', category: 'Productivity', description: 'Read and write Apple Notes on macOS.' },
  { name: 'apple-reminders', category: 'Productivity', description: 'Manage Apple Reminders lists and tasks.' },
  { name: 'bear-notes', category: 'Productivity', description: 'Bear Notes markdown note management.' },
  { name: 'notion', category: 'Productivity', description: 'Notion workspace pages, databases, and sync.' },
  { name: 'obsidian', category: 'Productivity', description: 'Obsidian vault read/write and search.' },
  { name: 'things-mac', category: 'Productivity', description: 'Things 3 task management on macOS.' },
  { name: 'trello', category: 'Productivity', description: 'Trello boards, lists, and card automation.' },
  { name: 'canvas', category: 'Productivity', description: 'Canvas LMS course and assignment operations.' },
  { name: 'session-logs', category: 'Productivity', description: 'Structured session logging and retrieval.' },
  { name: 'summarize', category: 'Productivity', description: 'Summarize long documents and transcripts.' },
  { name: 'oracle', category: 'Productivity', description: 'Oracle knowledge base Q&A interface.' },

  // Communication
  { name: 'discord', category: 'Communication', description: 'Discord messaging and channel management.' },
  { name: 'slack', category: 'Communication', description: 'Slack channels, DMs, and workflow triggers.' },
  { name: 'imsg', category: 'Communication', description: 'iMessage send/receive via macOS.' },
  { name: 'bluebubbles', category: 'Communication', description: 'BlueBubbles iMessage bridge for cross-platform.' },
  { name: 'himalaya', category: 'Communication', description: 'Himalaya CLI email client integration.' },
  { name: 'voice-call', category: 'Communication', description: 'Voice calling and telephony automation.' },

  // Media
  { name: 'camsnap', category: 'Media', description: 'Capture photos from connected cameras.' },
  { name: 'peekaboo', category: 'Media', description: 'Screenshot capture and visual analysis.' },
  { name: 'gifgrep', category: 'Media', description: 'Search and extract GIFs by content.' },
  { name: 'video-frames', category: 'Media', description: 'Extract frames from video files.' },
  { name: 'openai-whisper', category: 'Media', description: 'Local Whisper audio transcription.' },
  { name: 'openai-whisper-api', category: 'Media', description: 'Whisper API cloud transcription.' },
  { name: 'sherpa-onnx-tts', category: 'Media', description: 'Sherpa-ONNX local text-to-speech.' },
  { name: 'songsee', category: 'Media', description: 'Music identification and metadata lookup.' },
  { name: 'spotify-player', category: 'Media', description: 'Spotify playback and playlist control.' },
  { name: 'sonoscli', category: 'Media', description: 'Sonos speaker control and playback.' },
  { name: 'nano-pdf', category: 'Media', description: 'Lightweight PDF parsing and extraction.' },

  // Development
  { name: 'coding-agent', category: 'Development', description: 'Autonomous coding agent for dev tasks.' },
  { name: 'gh-issues', category: 'Development', description: 'GitHub issue tracking and automation.' },
  { name: 'github', category: 'Development', description: 'GitHub repos, PRs, commits, and releases.' },
  { name: 'tmux', category: 'Development', description: 'tmux session and pane orchestration.' },
  { name: 'skill-creator', category: 'Development', description: 'Scaffold and publish new OpenClaw skills.' },
  { name: 'mcporter', category: 'Development', description: 'MCP server porting and bridging utility.' },
  { name: 'node-connect', category: 'Development', description: 'Node.js process connection and IPC.' },
  { name: 'xurl', category: 'Development', description: 'Extended curl/HTTP request wrapper.' },
  { name: 'clawflow', category: 'Development', description: 'OpenClaw workflow orchestration engine.' },
  { name: 'clawflow-inbox-triage', category: 'Development', description: 'Automated inbox triage workflow.' },
  { name: 'clawhub', category: 'Development', description: 'ClawHub central automation hub.' },
  { name: 'blucli', category: 'Development', description: 'Bluetooth CLI device management.' },
  { name: 'eightctl', category: 'Development', description: 'Eight Sleep control CLI.' },
  { name: 'sag', category: 'Development', description: 'Sag command orchestration utility.' },
  { name: 'wacli', category: 'Development', description: 'WhatsApp CLI automation.' },

  // AI & Models
  { name: 'gemini', category: 'AI & Models', description: 'Google Gemini model access and routing.' },
  { name: 'model-usage', category: 'AI & Models', description: 'LLM usage tracking and cost reporting.' },

  // Home & IoT
  { name: 'openhue', category: 'Home & IoT', description: 'Philips Hue lighting control.' },

  // Shopping
  { name: 'gog', category: 'Shopping', description: 'GOG game library and purchase lookup.' },
  { name: 'ordercli', category: 'Shopping', description: 'Order tracking and fulfillment CLI.' },

  // Travel & Weather
  { name: 'goplaces', category: 'Travel & Weather', description: 'Places search, directions, and geo lookup.' },
  { name: 'weather', category: 'Travel & Weather', description: 'Weather forecasts and current conditions.' },

  // Content & SEO
  { name: 'blogwatcher', category: 'Content & SEO', description: 'Monitor blogs for new posts and changes.' },
]

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  Communication: '#3b82f6',
  Media: '#ec4899',
  Productivity: '#10b981',
  Development: '#8b5cf6',
  'AI & Models': '#f59e0b',
  'Home & IoT': '#06b6d4',
  Security: '#f43f5e',
  Shopping: '#eab308',
  'Travel & Weather': '#14b8a6',
  'Content & SEO': '#f97316',
  System: '#64748b',
}

export function categoryFor(skillName: string): SkillCategory {
  const entry = SKILL_CATALOG.find((s) => s.name === skillName)
  return entry?.category ?? 'System'
}
