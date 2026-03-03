# CLAUDE.md — HummingAgent CRM

> **Single source of truth for all AI agents working on this repo.**
> Read this before touching anything.

---

## Project Overview

**HummingAgent CRM** — AI-powered CRM built to replace HubSpot. Deal pipeline (kanban), contact/company management, email integration, AI chat assistant, Slack commands, and daily digest notifications.

- **Live URL:** https://crm.hummingagent.ai
- **Hosting:** Vercel
- **Repo:** `HummingAgent/crm` (private)
- **Database:** Supabase (shared instance with other HA apps, tables prefixed `crm_`)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19** + **Tailwind CSS 4** + **Radix UI** |
| Database | **Supabase** (PostgreSQL + Auth + RLS) |
| Auth | **Supabase Auth** (Google OAuth via middleware) |
| Drag & Drop | **DnD Kit** (kanban board) |
| AI Chat | **Azure OpenAI Foundry** (GPT-5.2, pipeline Q&A) |
| Email | **Resend** (outbound) + ingest API (inbound) |
| Notifications | **Slack** (webhooks + slash commands) |
| Calendar | **Google Calendar API** (OAuth, team view) |
| Icons | **Lucide** |
| Deployment | **Vercel** |

---

## Project Structure

```
crm/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx         # Google OAuth login
│   │   ├── (dashboard)/                  # All dashboard pages
│   │   │   ├── page.tsx                  # Dashboard home
│   │   │   ├── deals/page.tsx            # Kanban pipeline board
│   │   │   ├── contacts/page.tsx         # Contact list
│   │   │   ├── companies/page.tsx        # Company list
│   │   │   ├── emails/page.tsx           # Email view
│   │   │   ├── calendar/page.tsx         # Calendar
│   │   │   ├── analytics/page.tsx        # Pipeline analytics
│   │   │   ├── settings/page.tsx         # CRM settings
│   │   │   └── layout.tsx                # Dashboard layout (sidebar)
│   │   ├── api/                          # API routes
│   │   │   ├── deals/route.ts            # CRUD deals (GET, POST)
│   │   │   ├── deals/[id]/route.ts       # Single deal (GET, PATCH, DELETE)
│   │   │   ├── contacts/route.ts         # CRUD contacts
│   │   │   ├── companies/route.ts        # CRUD companies
│   │   │   ├── ai/chat/route.ts          # AI chat (OpenAI + CRM context)
│   │   │   ├── emails/send/route.ts      # Send email via Resend
│   │   │   ├── emails/ingest/route.ts    # Receive emails from agents
│   │   │   ├── notifications/slack/route.ts  # Slack webhook notifications
│   │   │   ├── slack/command/route.ts    # Slack slash commands (/crm)
│   │   │   ├── digest/route.ts           # Daily digest (stale deals, overdue)
│   │   │   ├── cron/digest/route.ts      # Cron trigger for digest
│   │   │   └── settings/route.ts         # CRM settings CRUD
│   │   ├── auth/callback/route.ts        # Supabase OAuth callback
│   │   └── page.tsx                      # Root redirect
│   │
│   ├── components/
│   │   ├── crm/                          # CRM-specific components
│   │   │   ├── deal-card.tsx             # Kanban deal card
│   │   │   ├── deal-column.tsx           # Kanban column
│   │   │   ├── deal-detail-panel.tsx     # Deal slide-out panel
│   │   │   ├── deal-filters.tsx          # Pipeline filters
│   │   │   ├── contact-detail-panel.tsx  # Contact detail view
│   │   │   ├── company-detail-panel.tsx  # Company detail view
│   │   │   ├── ai-chat.tsx              # AI chat assistant
│   │   │   ├── global-search.tsx         # Cmd+K search
│   │   │   ├── compose-email-dialog.tsx  # Email composer
│   │   │   ├── schedule-next-action.tsx  # Follow-up scheduler
│   │   │   ├── new-deal-dialog.tsx       # Create deal
│   │   │   ├── new-contact-dialog.tsx    # Create contact
│   │   │   ├── new-company-dialog.tsx    # Create company
│   │   │   ├── new-meeting-dialog.tsx    # Schedule meeting
│   │   │   ├── edit-deal-dialog.tsx      # Edit deal
│   │   │   ├── edit-contact-dialog.tsx   # Edit contact
│   │   │   └── edit-company-dialog.tsx   # Edit company
│   │   └── ui/                           # Generic UI components (Radix-based)
│   │
│   ├── lib/
│   │   ├── supabase/client.ts            # Browser Supabase client
│   │   ├── supabase/server.ts            # Server Supabase client
│   │   ├── supabase/types.ts             # TypeScript types
│   │   ├── notifications.ts              # Slack notification helper
│   │   └── utils.ts                      # cn() and utilities
│   │
│   └── middleware.ts                     # Auth middleware (Supabase SSR)
│
├── supabase/
│   ├── schema.sql                        # Full database schema
│   ├── schema-update-hubspot.sql         # HubSpot migration fields
│   └── cleanup.sql                       # Schema reset script
│
├── migrations/
│   ├── 001_stale_deals_and_outcomes.sql  # Stale deal tracking + settings table
│   └── 002_google_calendar_integration.sql # Team calendar tables
│
├── scripts/
│   ├── import-hubspot.js                 # Import deals from HubSpot CSV
│   ├── import-contacts.js                # Import contacts from HubSpot CSV
│   └── link-contacts-deals.js            # Link imported contacts to deals
│
├── docs/
│   ├── HUBSPOT-MIGRATION.md              # HubSpot migration plan
│   ├── hubspot-export.csv                # HubSpot deal export data
│   ├── hubspot-contacts-export.csv       # HubSpot contact export data
│   └── Nectar-CRM-Overview.pdf           # Competitor reference
│
├── WIREFRAMES.md                         # Full design spec (mobile-first)
└── package.json
```

---

## Database Schema

All tables prefixed with `crm_` (shared Supabase instance). Schema in `supabase/schema.sql`.

| Table | Purpose |
|-------|---------|
| `crm_pipelines` | Multiple pipelines (Hot Deals, Warm, Lead Pool) |
| `crm_companies` | Organizations (name, domain, industry, research notes) |
| `crm_contacts` | People (name, email, phone, title, company_id, lead_source) |
| `crm_deals` | Pipeline deals (name, stage, amount, priority, next_action, outcome, pipeline_id) |
| `crm_deal_contacts` | Many-to-many deals ↔ contacts (with role: decision-maker, etc.) |
| `crm_activities` | Unified timeline (emails, calls, meetings, notes, stage-changes) |
| `crm_products` | Products/services catalog |
| `crm_deal_products` | Line items on deals |
| `crm_pipeline_stages` | Customizable pipeline stages (11 default stages) |
| `crm_settings` | Key-value settings (stale thresholds, Slack webhook, digest time) |
| `crm_team_members` | Team members (name, email, calendar color) |
| `crm_calendar_connections` | Google Calendar OAuth tokens per team member |
| `crm_calendar_events` | Cached events from connected Google Calendars |

### Multiple Pipelines
The CRM supports multiple pipelines for different deal workflows:

| Pipeline | Slug | Purpose | Color |
|----------|------|---------|-------|
| **Hot Deals** | `hot-deals` | Active deals in negotiation | Red (#ef4444) |
| **Warm** | `warm` | Interested prospects with potential | Amber (#f59e0b) |
| **Lead Pool** | `lead-pool` | New leads and prospects | Blue (#3b82f6) |

Each pipeline has its own set of stages. Deals belong to exactly one pipeline.
Selected pipeline persists via localStorage.

Table: `crm_pipelines`

### Pipeline Stages (default - Hot Deals)
```
new-lead → discovery-scheduled → discovery-complete → proposal-draft →
proposal-sent → contract-sent → closed-won / closed-lost
                                 follow-up → current-customer
                                              dead
```

### Warm Pipeline Stages
```
New → Researching → Contacted → Interested → Qualified → Not Interested
```

### Lead Pool Pipeline Stages
```
New Leads → To Research → Researched → To Contact → Promoted to Warm → Disqualified
```

### Deal Lifecycle
- **Open stages:** new-lead through contract-sent, follow-up
- **Won stages:** closed-won, current-customer
- **Lost stages:** closed-lost, dead

### RLS
RLS is enabled on all tables but currently uses permissive "allow all" policies. Multi-tenant enforcement is planned for later.

---

## Authentication

- **Supabase Auth** with Google OAuth
- Middleware (`src/middleware.ts`) checks auth on all non-public routes
- Public routes: `/login`, `/signup`, `/auth/*`, `/api/*`
- OAuth callback at `/auth/callback`

---

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/deals` | GET, POST | List/create deals (with company/contact joins) |
| `/api/deals/[id]` | GET, PATCH, DELETE | Single deal CRUD + stage change logging |
| `/api/contacts` | GET, POST | List/create contacts |
| `/api/companies` | GET, POST | List/create companies |
| `/api/ai/chat` | POST | AI chat — fetches full CRM context, sends to Azure OpenAI (GPT-5.2) |
| `/api/emails/send` | POST | Send email via Resend, logs activity on deal |
| `/api/emails/ingest` | GET, POST | Receive emails from external agents, auto-match to contacts/deals |
| `/api/notifications/slack` | POST | Send formatted Slack notifications (deal events) |
| `/api/slack/command` | POST | Handle `/crm` slash commands (add, deal, log, status, digest) |
| `/api/digest` | POST | Generate daily digest (overdue, stale, today's actions) → Slack |
| `/api/cron/digest` | GET | Cron trigger for daily digest (Vercel cron) |
| `/api/settings` | GET, POST | CRM settings (stale thresholds, etc.) |
| `/api/calendar/auth` | GET | Start Google Calendar OAuth flow |
| `/api/calendar/callback` | GET | Google OAuth callback, stores tokens |
| `/api/calendar/events` | GET | Fetch events from all connected Google Calendars |
| `/api/calendar/team` | GET, POST | List/add team members for calendar |

### Email Ingest API
External agents can push emails into the CRM:
- Auth via `CRM_API_KEY` env var (Bearer token or X-API-Key header)
- Auto-matches sender email to contacts
- Logs as activity on associated deals
- Can auto-create contacts and leads (`auto_create_contact`, `auto_create_lead`)

### Slack Slash Commands (`/crm`)
- `/crm add <first> <last> <company>` — Create contact
- `/crm deal <name> [stage]` — Create/update deal
- `/crm log <deal-name> <note>` — Log activity
- `/crm status` — Pipeline summary
- `/crm digest` — Trigger daily digest

---

## AI Chat Assistant

The AI chat (`/api/ai/chat`) loads the **entire CRM state** as context:
- All deals with stage, amount, company, contact, priority
- Pipeline summary stats (open count, total value, won/lost)
- Stage breakdown
- Recent contacts (top 50)
- All companies

Uses **Azure OpenAI Foundry** (GPT-5.2) via `@ai-sdk/azure`. The endpoint is HummingAgent's shared Azure Foundry instance (`humming-agent-foundry-dev`). Answers questions about pipeline, deals, contacts, and provides sales insights.

---

## Key Features

1. **Multi-Pipeline Kanban** — Multiple pipelines (Hot Deals, Warm, Lead Pool) with drag-and-drop, customizable stages per pipeline
2. **AI Chat** — Ask anything about your pipeline (full CRM context injection)
3. **Global Search** — Cmd+K shortcut, searches deals/contacts/companies
4. **Email Integration** — Send (Resend) + receive (ingest API) with auto-deal linking
5. **Slack Integration** — Slash commands, webhook notifications, daily digest
6. **Stale Deal Alerts** — Configurable thresholds per stage, daily digest
7. **Follow-up Scheduling** — Next action + date + type on each deal
8. **Activity Timeline** — Unified log (emails, calls, meetings, notes, stage changes)
9. **HubSpot Migration** — Import scripts for deals and contacts from CSV exports
10. **Mobile-First Design** — Glass morphism UI, bottom sheets, swipe gestures
11. **Team Calendar** — Google Calendar integration, see everyone's calendar in one view

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role (API routes) |
| `AZURE_OPENAI_API_KEY` | ✅ | Azure Foundry API key |
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure Foundry endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | ✅ | Model deployment name (gpt-5.2) |
| `AZURE_OPENAI_API_VERSION` | Optional | API version (default: 2025-04-01-preview) |
| `RESEND_API_KEY` | Optional | Outbound email |
| `SLACK_WEBHOOK_URL` | Optional | Slack notifications + digest |
| `CRM_API_KEY` | Optional | Auth for email ingest API |
| `CRON_SECRET` | Optional | Vercel cron auth |
| `NEXT_PUBLIC_APP_URL` | Optional | App URL for internal API calls |
| `GOOGLE_CALENDAR_CLIENT_ID` | Optional | Google OAuth client ID (for calendar) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Optional | Google OAuth client secret (for calendar) |

---

## Deployment

Deployed on **Vercel**. Push to `main` deploys to production.

```bash
# Local dev
npm install
npm run dev    # http://localhost:3000
```

---

## Data Migration

HubSpot data was imported using scripts in `scripts/`:
1. `import-hubspot.js` — Imports deals from `docs/hubspot-export.csv`
2. `import-contacts.js` — Imports contacts from `docs/hubspot-contacts-export.csv`
3. `link-contacts-deals.js` — Links contacts to deals by company match

---

## Codebase Stats

- **~13,700 lines** TypeScript/TSX/JS
- **~80 files** (excluding node_modules, .next, .git)
- **20 components** in `src/components/crm/`
- **12 API routes**
- **9 database tables** + 1 settings table

---

## ⚠️ Safety Rules

1. **Always `git pull` before starting work** — multiple bots may work on this repo
2. **Don't modify env vars or secrets** — they're in Vercel, not in the repo
3. **All tables use `crm_` prefix** — this is a shared Supabase instance
4. **RLS is permissive right now** — don't assume row-level security is enforced
5. **Keep this file updated** when you make architectural changes
