# Deploy StandupAI (Supabase + Vercel + Inngest)

Dummy/demo data has been removed from the repo. Production starts empty — the first user creates an organization at `/setup`.

---

## Part 1 — GitHub (you do this first)

1. Create a GitHub repo and push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial StandupAI"
   git remote add origin git@github.com:YOUR_ORG/standupai.git
   git push -u origin main
   ```
2. Do **not** commit `.env.local` (it is gitignored).

---

## Part 2 — Supabase Cloud

### 2a. Create project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a region close to your users; save the database password.

### 2b. Link CLI and push schema

```bash
npm install -g supabase   # or use npx
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies all migrations in `supabase/migrations/` (no demo seed).

### 2c. Auth URLs

In Supabase → **Authentication** → **URL configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://YOUR_APP.vercel.app` |
| Redirect URLs | `https://YOUR_APP.vercel.app/auth/callback` |

(Use your final Vercel domain; add `http://localhost:3000/auth/callback` for local dev.)

Optional: **Authentication** → **Providers** → disable public sign-ups if you only want invite + setup flows (email/password can stay enabled for invited users).

### 2d. Copy API keys

Supabase → **Project Settings** → **API**:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only, never expose to client**)

---

## Part 3 — Vercel

### 3a. Import project

1. [vercel.com/new](https://vercel.com/new) → import your GitHub repo.
2. Framework: **Next.js** (auto-detected).
3. Add **Environment Variables** (Production + Preview):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `MISTRAL_API_KEY` | From [console.mistral.ai](https://console.mistral.ai) |
| `MISTRAL_MODEL` | `mistral-small-latest` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_APP.vercel.app` |
| `INNGEST_EVENT_KEY` | From Part 4 (add after first deploy if needed) |
| `INNGEST_SIGNING_KEY` | From Part 4 |

**Do not set** `INNGEST_DEV` in production.

4. Deploy.

### 3b. Redeploy after Inngest

After connecting Inngest (Part 4), trigger a **Redeploy** on Vercel so `/api/inngest` registers with Inngest Cloud.

---

## Part 4 — Inngest Cloud

1. [app.inngest.com](https://app.inngest.com) → create app.
2. **App URL**: use your **stable production domain**, e.g. `https://YOUR_APP.vercel.app/api/inngest`
   - Do **not** use a preview URL like `https://your-app-abc123-team.vercel.app/...` (changes every deploy).
3. Copy **Event Key** and **Signing Key** into Vercel env vars (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`).
4. **Disable Vercel Deployment Protection for Production** (see troubleshooting below) — Inngest must reach `/api/inngest` without SSO login.
5. Redeploy Vercel.
6. In Inngest dashboard, confirm functions appear:
   - `daily-agent-sync` (cron 9:00 UTC)
   - `manual-team-sync`

Adjust cron timezone in `src/inngest/functions.ts` before deploy if 9 AM UTC is wrong for your team.

---

## Part 5 — First-run checklist (production)

After deploy:

- [ ] Visit `https://YOUR_APP.vercel.app/setup` → create company, team, admin
- [ ] Admin → **Team** → invite employees
- [ ] Admin → **Integrations** → generate GitHub webhook secret, configure repo webhook
- [ ] Map each employee’s GitHub username
- [ ] Admin → **Meeting logs** → run manual sync to verify Mistral + Inngest
- [ ] Employee opens invite link → sets password → sees dashboard tasks after sync

---

## Part 6 — GitHub webhook (per repo)

Admin → **Integrations** shows your exact payload URL:

```
https://YOUR_APP.vercel.app/api/webhooks/github/[companyId]
```

In GitHub repo → **Settings** → **Webhooks**:

- Content type: `application/json`
- Secret: from StandupAI Integrations tab
- Events: **Just the push event**

---

## Optional — clean local database

If your local DB still has old Acme demo data:

```bash
npx supabase db reset
```

Then use `/setup` locally (no seed script anymore).

---

## Environment summary

| | Local | Production |
|---|--------|------------|
| Supabase | `supabase start` | Supabase Cloud |
| `INNGEST_DEV` | `1` | **unset** |
| Inngest | `npx inngest-cli dev` | Inngest Cloud |
| App URL | `http://localhost:3000` | Vercel domain |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/setup` redirects to login | Users already exist; sign in or reset DB |
| Inngest sync error: "We could not reach your URL" | **Vercel Deployment Protection** is blocking Inngest. Vercel → Project → Settings → **Deployment Protection** → disable for Production (or protect Preview only). Then set Inngest App URL to your stable production domain, not a preview hash URL. |
| Inngest shows events but no functions | Set `INNGEST_SIGNING_KEY` on Vercel (not just event key), redeploy, resync |
| Sync does nothing | Check Inngest dashboard + `MISTRAL_API_KEY` on Vercel |
| GitHub webhook 401 | Secret mismatch — rotate in Admin → Integrations and update GitHub |
| Invite links wrong host | Set `NEXT_PUBLIC_APP_URL` on Vercel |
