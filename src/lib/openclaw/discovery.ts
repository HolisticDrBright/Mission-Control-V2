import { readFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import type { Agent } from '@/lib/types'

export interface OpenClawAgentConfig {
  id: string
  name: string
  model: string
  provider: string
  capabilities: string[]
  endpoint: string
}

export interface OpenClawConfig {
  gateway_url: string
  api_key: string
  workspace_id: string
  agents: OpenClawAgentConfig[]
}

const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json')

export async function readOpenClawConfig(
  configPath: string = CONFIG_PATH
): Promise<OpenClawConfig> {
  try {
    const raw = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(raw)

    return {
      gateway_url: parsed.gateway_url ?? parsed.gatewayUrl ?? 'ws://localhost:9800',
      api_key: parsed.api_key ?? parsed.apiKey ?? '',
      workspace_id: parsed.workspace_id ?? parsed.workspaceId ?? 'default',
      agents: Array.isArray(parsed.agents)
        ? parsed.agents.map(normalizeAgentConfig)
        : [],
    }
  } catch (err) {
    throw new Error(
      `Failed to read OpenClaw config from ${configPath}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

function normalizeAgentConfig(raw: Record<string, unknown>): OpenClawAgentConfig {
  return {
    id: String(raw.id ?? raw.agent_id ?? ''),
    name: String(raw.name ?? raw.agent_name ?? 'Unnamed Agent'),
    model: String(raw.model ?? raw.model_id ?? 'unknown'),
    provider: String(raw.provider ?? 'unknown'),
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.map(String)
      : [],
    endpoint: String(raw.endpoint ?? raw.url ?? ''),
  }
}

export async function discoverAgents(
  configPath: string = CONFIG_PATH
): Promise<Agent[]> {
  const config = await readOpenClawConfig(configPath)
  return config.agents.map(mapToAgent)
}

export function mapToAgent(oclAgent: OpenClawAgentConfig): Agent {
  const now = new Date().toISOString()

  return {
    id: oclAgent.id,
    name: oclAgent.name,
    role: 'custom',
    source: 'openclaw',
    model: oclAgent.model,
    status: 'offline',
    instructions: null,
    capabilities: oclAgent.capabilities,
    skills: null,
    project_id: null,
    openclaw_agent_id: oclAgent.id,
    heartbeat_at: null,
    current_task_id: null,
    total_runs: 0,
    total_cost_usd: 0,
    avg_outcome_score: null,
    created_at: now,
    updated_at: now,
  }
}

