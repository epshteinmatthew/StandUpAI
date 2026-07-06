# StandupAI

AI agents automate your team's daily standup — check off tasks from commits, resolve blockers, align on goals, and assign work for the next 24 hours.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind + Shadcn-style UI
- **Supabase** (PostgreSQL + Auth + RLS)
- **Vercel AI SDK** + Mistral (`mistral-small-latest`)
- **Inngest** (daily cron + manual sync trigger)

## Local development

```bash
npm install
cp .env.example .env.local
# Start Supabase (Docker required), apply migrations, write local env:
bash scripts/start-supabase.sh
# Add MISTRAL_API_KEY to .env.local, then:
npm run dev
npx inngest-cli@latest dev   # background jobs at http://localhost:8288
```

First visit: **http://localhost:3000/setup** to create your organization and admin account.

## Production deployment

See **[DEPLOY.md](./DEPLOY.md)** for Supabase + Vercel + Inngest setup (manual steps).

## Role-based UI

| Role | Route | Capabilities |
|------|-------|--------------|
| Employee | `/dashboard` | Read-only task list; edit agent notes only |
| Admin | `/admin` | Edit goals/deadlines; invite team; integrations; meeting logs |

Task completion is **never** manual for employees — agents mark items complete via commit cross-reference during Step 1.

## Accounts & invites

1. **First admin** — `/setup` when no users exist (or **Create organization** on the home page).
2. **Invite teammates** — Admin → **Team** → **Create invite link** (expires in 7 days).
3. **Accept invite** — `/invite/[token]`, set password, auto sign-in.

## GitHub webhooks

Admin → **Integrations**: generate webhook secret, configure GitHub push events, map employee GitHub usernames.

Endpoint: `POST /api/webhooks/github/[companyId]`

## Project structure

```
supabase/migrations/     SQL schema + RLS
src/lib/sync/            Daily meeting protocol
src/inngest/             Cron + event handlers
src/app/api/webhooks/    GitHub ingest
src/app/dashboard/       Employee view
src/app/admin/           Admin view
```
