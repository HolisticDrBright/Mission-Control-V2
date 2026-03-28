# Mission Control V2 — Dr. Brandon Bright Operations Dashboard

Unified command center for clinic operations, AI-powered trading, autonomous agents, content generation, and system monitoring.

**Live:** http://137.184.84.143:3000 (Passcode: Holistic4Life)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
# http://localhost:3000
```

## 📊 Dashboards

### 1. **Polymarket Trading Dashboard** (`/`)
Real-time trading analytics for Polymarket prediction markets:
- **Portfolio Overview** — Balance, ROI, active trades, P&L
- **Equity Curve** — Historical balance chart with trend
- **Active Trades** — Live positions with entry price, current price, P&L
- **Market Universe** — All available markets with prices & liquidity
- **Entropy Analysis** — Kelly-optimal position sizing
- **Whale Tracker** — Copy-trade whale movements
- **Jet Tracker** — High-frequency signal detection

**Data Source:** Backend API (`/api/portfolio/*`, `/api/markets/*`, `/api/whale/*`, `/api/jet/*`)
**Refresh Rate:** 15-30 seconds (configurable)

---

### 2. **CashClaw Monitoring Dashboard** (`/cashclaw`)
Autonomous AI agent earnings & task execution analytics:

**Earnings Overview**
- Total ETH earned (with USD conversion)
- Tasks completed, average client rating, net profit

**Daily Earnings Chart**
- Area chart showing earnings trajectory over selected period
- Tooltips with ETH + task count per day

**Pipeline Stats**
- Completed/declined/failed task counts
- Acceptance rate, revision rate, return client rate
- Unique clients served

**Top Categories**
- Task types ranked by total earnings
- Average earnings per task by category

**Hourly Activity**
- 24-hour distribution showing when CashClaw is busiest
- Peak hours identification

**Recent Tasks Table**
- Full execution log with status pills
- Category, earned ETH, client rating, outcome score, duration
- Sortable & filterable

**ML Ops Panel**
- Bid gate accuracy, dynamic pricing usage
- Ensemble runs, prompt version, study sessions

**Live Heartbeat**
- Real-time connection to CashClaw server (localhost:3777)
- Active tasks, WebSocket status, poll count, uptime

**Time Selector**
- Toggle 7d / 30d / 90d / All
- Auto-refresh every 30 seconds

**Database Schema** (Supabase):
```sql
cashclaw_task_runs        — Full execution log
cashclaw_client_profiles  — Client LTV tracking
cashclaw_pricing_records  — Dynamic pricing history
cashclaw_daily_earnings   — Materialized daily snapshots
cashclaw_negative_examples — Failed task examples
```

**Setup:**
```bash
# 1. Run Supabase migration
# File: 002_cashclaw_tables.sql

# 2. Set environment variable
CASHCLAW_API_URL=http://localhost:3777

# 3. CashClaw's own Supabase writes populate the tables
# Mission Control reads them via queries
```

**Location in UI:** Sidebar → Revenue > CashClaw

---

### 3. **System Health Dashboard** (`/system-health`)
Real-time infrastructure monitoring with 5-second refresh:

**Circular Gauge Rings** (color-coded)
- CPU usage — Green <75%, Amber 75-90%, Red >90%
- Memory — System RAM + Next.js RSS + V8 heap
- Disk — Per mount point with used/total/free
- Load Average — 1min, 5min, 15min relative to core count

**Per-Core CPU Bars**
- Individual usage for each processor core
- Visual identification of uneven load

**Memory Breakdown**
- System RAM allocation
- Next.js process RSS (resident set size)
- V8 heap used vs. total capacity

**Disk Usage**
- Per mount point with percentages
- Free space warnings

**Top Processes**
- Sorted by CPU usage
- PID, CPU%, MEM%, command name

**System Info Banner**
- Hostname, platform, architecture
- Uptime, Node.js version, CPU model

**Overall Health Status**
- Auto-calculated as: Healthy / Degraded / Critical
- Based on combined metrics

**Controls:**
- Toggle auto-refresh on/off
- Manual refresh button
- Time range selector (optional)

**Location in UI:** Sidebar → System > System Health

---

### 4. **Viral Reel Flow Dashboard** (`/viral`)
AI-powered video generation pipeline for social media:
- Competitor analysis from GenViral
- Script generation via Claude
- HeyGen avatar video generation
- Veo enhancement (effects, B-roll, text overlays)
- Auto-upload to GenViral Media Library

**Status:** 5 videos generated (IDs in database)

---

### 5. **Blog Management Dashboard** (`/blog`)
WordPress integration for content publishing:
- Draft creation & review
- Approval workflow
- Auto-publish to holisticdrbright.com
- Schedule management

---

### 6. **Email Sequences Dashboard** (`/email`)
D-Spiked funnel automation:
- 4-segment customer automation
- Open rate & click tracking
- Outcome logging to ML Ops

---

### 7. **Documents Dashboard** (`/documents`)
PDF & document management:
- VA daily task forms
- Email templates
- Blog drafts
- Download as PDF

---

## 🔧 Architecture

```
Frontend (Next.js)
├── /app — Routes & layouts
├── /components — Reusable UI components
├── /hooks — React Query hooks for API calls
├── /stores — Zustand state management
└── /lib — Utilities & API client

Backend (FastAPI)
├── /api/portfolio — Trading positions & stats
├── /api/markets — Market data & entropy
├── /api/whale — Whale tracker signals
├── /api/jet — Jet (HFT) signals
├── /api/signals — Combined signal generation
└── /cron — Scheduled jobs (SEO, email, content)

Database (Supabase)
├── cashclaw_* — CashClaw task execution
├── viral_* — Video generation metadata
├── email_sequences — Automation logs
└── blog_posts — Content drafts & published
```

---

## 🚀 Deployment

**Production Server:** 137.184.84.143:3000
**Service Manager:** systemd (mission-control.service)

```bash
# Check status
systemctl status mission-control.service

# Restart after changes
systemctl restart mission-control.service

# View logs
journalctl -u mission-control.service -f
```

---

## 📝 Recent Updates

- ✅ **CashClaw Monitoring** — Full earnings dashboard with 7 sections
- ✅ **System Health** — Real-time infrastructure metrics
- ✅ **Sidebar Links** — Fixed SEO, Notion, and Dashboard routes
- ✅ **API Integration** — All 26 backend endpoints connected
- ✅ **Polymarket Frontend** — Live trading dashboard (URL routing fixed)

---

## 📚 Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.io/docs)
- [Polymarket API](https://clob.polymarket.com)
- [HeyGen Avatar API](https://docs.heygen.com)
