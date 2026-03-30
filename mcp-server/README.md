# Mission Control MCP Server

MCP (Model Context Protocol) server that exposes the full Mission Control V2 database as tools for Claude Desktop, Claude Code (Cowork), or any MCP-compatible client.

## What it does

Gives Claude direct access to:
- **Projects, Tasks, Agents** — full CRUD
- **Kanban board** — move tasks between columns
- **Inbox** — read/action messages, approval flows
- **Scheduled Jobs** — manage cron jobs
- **SEO Automation** — trends, keywords, articles pipeline
- **Cold Outreach** — signals, leads, campaigns, replies
- **CashClaw** — earnings, task runs, client profiles
- **ML Ops** — task logs, prompt versions, pattern analysis
- **Viral Reels** — UGC pipeline management
- **VA Tasks** — delegation board
- **Alerts & Budget** — system monitoring
- **Dashboard** — aggregated system overview
- **System Health** — CPU, RAM, disk metrics

## Setup

```bash
cd mcp-server
pnpm install
pnpm build
```

## Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (for API route calls)
MC_API_TOKEN=your-api-token
CASHCLAW_API_URL=http://localhost:3777
```

## Running

```bash
# Production (built)
node dist/index.js

# Development
pnpm dev
```

## Claude Desktop Config

Add this to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mission-control": {
      "command": "node",
      "args": ["/path/to/Mission-Control-V2/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Claude Code (Cowork) Config

Add to your `.claude/settings.json` or project-level `.mcp.json`:

```json
{
  "mcpServers": {
    "mission-control": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Available Tools

### Core Entities
| Tool | Description |
|------|-------------|
| `list_projects` | List projects with filters (status, type) |
| `get_project` | Get project by ID |
| `create_project` | Create a new project |
| `update_project` | Update project fields |
| `delete_project` | Delete a project |
| `list_agents` | List AI agents (filter by status, role, project) |
| `get_agent` | Get agent by ID |
| `create_agent` | Register a new agent |
| `update_agent` | Update agent (status, model, instructions) |
| `list_tasks` | List tasks (filter by project, agent, kanban, priority) |
| `get_task` | Get task by ID |
| `create_task` | Create a task |
| `update_task` | Update task fields |
| `move_task` | Move task to kanban column (auto-timestamps) |
| `delete_task` | Delete a task |

### Communication
| Tool | Description |
|------|-------------|
| `list_inbox` | List inbox messages (filter by status, type) |
| `get_message` | Get message by ID |
| `create_message` | Send an inbox message |
| `action_message` | Take action on a message |
| `mark_read` | Mark message as read |

### Scheduling
| Tool | Description |
|------|-------------|
| `list_jobs` | List scheduled jobs |
| `create_job` | Create a cron job |
| `update_job` | Update job settings |
| `delete_job` | Delete a job |

### SEO
| Tool | Description |
|------|-------------|
| `list_blog_posts` | List blog posts by site |
| `create_blog_post` | Create a blog post |
| `update_blog_post` | Update post (status, content, SEO) |
| `list_keywords` | List tracked keywords |
| `list_seo_trends` | SEO automation trends |
| `list_seo_keywords` | SEO automation keyword research |
| `list_seo_articles` | SEO automation articles |

### Outreach
| Tool | Description |
|------|-------------|
| `list_outreach_signals` | List buying signals |
| `list_outreach_leads` | List leads by pipeline stage |
| `get_outreach_lead` | Get lead details |
| `update_outreach_lead` | Update lead (stage, sentiment) |
| `list_outreach_replies` | List email replies |
| `action_reply` | Mark reply as actioned |

### CashClaw
| Tool | Description |
|------|-------------|
| `list_cashclaw_runs` | List CashClaw task runs |
| `get_cashclaw_summary` | Earnings summary (ETH, ratings) |
| `list_cashclaw_clients` | Client profiles |

### ML Ops
| Tool | Description |
|------|-------------|
| `list_task_logs` | Agent execution logs |
| `list_prompt_versions` | Prompt version history |
| `list_pattern_analyses` | Pattern analysis reports |

### System
| Tool | Description |
|------|-------------|
| `list_alerts` | System alerts |
| `create_alert` | Create an alert |
| `acknowledge_alert` | Acknowledge an alert |
| `list_activity` | Activity log |
| `log_activity` | Log an activity event |
| `get_dashboard_summary` | Full system overview |
| `get_budget_status` | Daily budget breakdown |
| `get_system_health` | CPU/RAM/Disk metrics |

### Resources
| URI | Description |
|-----|-------------|
| `mission-control://dashboard` | Live dashboard state |
| `mission-control://budget` | Current budget status |
| `mission-control://alerts` | Unacknowledged alerts |
