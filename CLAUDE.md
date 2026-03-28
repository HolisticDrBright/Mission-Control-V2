# Mission Control — AI Workspace

This is Brandon's unified AI operations command center.

## Tech Stack
- Next.js 15 (App Router) + TypeScript 5 (strict)
- Tailwind CSS v4 + custom liquid glass design system
- Supabase (PostgreSQL + Realtime + Auth)
- Zustand 5 for state management
- @dnd-kit for drag & drop
- Recharts for charts
- cmdk for command palette

## Active Projects
<!-- Auto-generated from projects table -->

## Agent Roster
<!-- Auto-generated from agents table -->

## Current Sprint
<!-- Top 10 in-progress tasks -->

## Context Files
- src/lib/types.ts — All TypeScript types
- src/store/index.ts — Zustand global state
- src/lib/supabase/client.ts — Browser Supabase client
- src/lib/supabase/server.ts — Server Supabase client

## Development
```bash
pnpm install
pnpm dev    # Runs on http://localhost:3001
```

## Project Structure
- src/app/ — Next.js pages and API routes
- src/components/ — React components (layout, ui, dashboard, tasks, agents, seo, etc.)
- src/lib/ — Utilities, Supabase clients, integrations (openclaw, cowork, notion, ml-ops)
- src/store/ — Zustand state management
