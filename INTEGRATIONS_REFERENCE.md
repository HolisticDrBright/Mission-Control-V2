# Mission Control - Complete Integrations Reference

**Last Updated:** April 4, 2026 - 15:09 UTC  
**Status:** 23 Active Integrations - All Configured & Authenticated

## Configuration

All API keys are stored in `.env.integrations` (not committed to Git for security).

To activate all integrations:
```bash
cp .env.integrations .env.local
npm run dev
# or
npm run build && systemctl restart mission-control-dashboard.service
```

## Active Integrations

### Communication (3)
- **Telegram** - Bot + Jarvis + Gateway
- **ManyChat** - Social media automation
- **OpenClaw Gateway** - Message routing

### AI & LLM (3)
- **OpenAI** - ChatGPT API (gpt-4, gpt-3.5)
- **Anthropic** - Claude API (2 keys for redundancy)
- **Mem0** - Long-term memory & knowledge base

### Content Creation & Media (4)
- **HeyGen** - Avatar video generation (Avatar ID: 28d504143acb4a00a28fed1a55f7aced)
- **ElevenLabs** - Text-to-speech narration
- **Pexels** - Stock photo library
- **GenViral** - Trending topic discovery

### Search & Research (2)
- **Brave Search API** - Keyword research & trend discovery
- **Instantly.ai** - Cold email outreach automation

### Content Publishing (1)
- **WordPress** - holisticdrbright.com (REST API + auth)

### E-Commerce & Payments (3)
- **Shopify** - DSpiked product store
- **Stripe** - Payment processing (ready)
- **GoHighLevel** - CRM (Location: jLG1TNDDaVpR5AztqX4F)

### Database & Storage (2)
- **Supabase** - PostgreSQL database (Project: utuszztwwadvoxxuyshn)
- **DigitalOcean Spaces** - S3-compatible object storage

### SEO & Analytics (1)
- **Google Search Console** - Ranking data (holisticdrbright.com: Grade D, 45 clicks, 3,156 impressions)

### Trading & Crypto (4)
- **Polymarket** - Prediction market bot (7 strategies, paper trading)
- **Kraken** - Crypto exchange API
- **Coinstats** - Crypto market data
- **Alpaca** - Stock trading (emergency code configured)

### Infrastructure & Ops (2)
- **DigitalOcean** - VPS & compute
- **GitHub** - Source control

### Monitoring & Observability (1)
- **Sentry** - Error tracking & performance monitoring

## Integration Health Checks

```bash
# Test Supabase connection
curl https://utuszztwwadvoxxuyshn.supabase.co/rest/v1/agents?select=*

# Test WordPress
curl https://holisticdrbright.com/wp-json/wp/v2/posts

# Test Google Search Console
curl http://localhost:3001/api/seo/google-console

# Test Polymarket
curl http://localhost:3201/api/status
```

## Environment Variables Required

See `.env.integrations` for all keys. Critical ones:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY_*`
- `WORDPRESS_URL` + `WORDPRESS_APP_PASSWORD`
- `GOHIGHLEVEL_API_KEY`
- `HEYGEN_API_KEY`
- `ELEVENLABS_API_KEY`
- `SENTRY_DSN`

## Recent Additions (April 4)

- ✅ Sentry error tracking for Mission Control backend
- ✅ Instantly.ai cold email automation
- ✅ Alpaca trading emergency code
- ✅ All 23 integrations documented & tested

## Next Steps

1. Add Google Search Console OAuth setup UI to Mission Control
2. Integrate Stripe for D-Spiked payment processing
3. Set up Apollo.io for B2B lead enrichment
4. Configure Hunter.io for email verification
5. Add Notion sync for project management
