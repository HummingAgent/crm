# HummingAgent CRM

The AI-powered CRM that's 1000x better than HubSpot.

## Features

- **Deal Pipeline**: Drag-and-drop kanban board with customizable stages
- **Contact Management**: Everything about a person in one place
- **Company Profiles**: Auto-research, linked contacts and deals
- **Activity Timeline**: Emails, calls, meetings, notes - all tracked
- **Meeting Transcriptions**: Auto-synced from Vexa
- **Email Integration**: Inbox monitoring and auto-lead creation
- **Analytics Dashboard**: Pipeline metrics, deal velocity, forecasting
- **Slack Notifications**: Real-time alerts on stage changes
- **AI Agents**: Auto-research, follow-up sequences, email drafting

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **Drag & Drop**: DnD Kit
- **Icons**: Lucide

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Database Schema

Tables are prefixed with `crm_` to share the database with other HummingAgent apps:

- `crm_companies` - Organizations
- `crm_contacts` - People
- `crm_deals` - Opportunities/pipeline
- `crm_deal_contacts` - Many-to-many deals ↔ contacts
- `crm_activities` - Timeline events (emails, calls, meetings, notes)
- `crm_products` - Products/services
- `crm_deal_products` - Line items on deals
- `crm_pipeline_stages` - Customizable pipeline stages

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Deployment

Deploy on Vercel:

```bash
vercel --prod
```

---

Built by HummingAgent 🐝
