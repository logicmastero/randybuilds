# Sitecraft — AI-Powered Web Design

**Paste a URL. Get a premium website in 60 seconds.**

Sitecraft is a production-ready SaaS platform that generates professional, conversion-optimized websites for small businesses using AI. Users paste their URL (or describe their business), and Claude builds them a custom site preview instantly.

→ **Live:** https://randybuilds.vercel.app

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **AI:** Anthropic Claude (copy generation)
- **Scraping:** Firecrawl API
- **Auth:** Supabase (Google OAuth + Magic Link)
- **Email:** Resend (welcome emails)
- **Cache:** Upstash Redis
- **Deploy:** Vercel

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage + AI site generator |
| `/login` | Auth page (Google OAuth + magic link) |
| `/dashboard` | User dashboard (saved projects) |
| `/pricing` | Pricing plans + comparison |
| `/build` | Site editor (chat-based edits) |
| `/preview/[slug]` | Shareable preview URL |
| `/api/auth/callback` | OAuth callback |
| `/api/auth/welcome` | Welcome email trigger |
| `/api/auth/signout` | Sign out |
| `/api/scrape` | Website scraping via Firecrawl |
| `/api/redesign` | AI copy generation via Claude |
| `/api/chat-edit` | Chat-based site editing |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

### Required

```
ANTHROPIC_API_KEY=sk-ant-...         # https://console.anthropic.com
FIRECRAWL_API_KEY=fc-...             # https://firecrawl.dev
```

### For Authentication (Google Login + Magic Links)

1. Create a project at https://supabase.com
2. Go to **Auth → Providers → Google** and enable it
3. Add your Google OAuth credentials (from https://console.cloud.google.com)
4. Set the redirect URL: `https://your-domain.vercel.app/api/auth/callback`
5. Copy your project URL and keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # Settings → API → service_role key
```

### For Welcome Emails

1. Sign up at https://resend.com (100 emails/day free)
2. Verify your domain (or use the sandbox for testing)
3. Add your API key:

```
RESEND_API_KEY=re_...
```

### For Preview Storage (Optional but recommended)

1. Create a free Redis at https://upstash.com
2. Copy REST credentials:

```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### App URL

```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## Supabase Database Setup

After creating your Supabase project, run this SQL to create the projects table:

```sql
create table public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  business_name text,
  source_url text,
  html text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-level security: users can only see their own projects
alter table public.projects enable row level security;

create policy "Users see own projects" on public.projects
  for all using (auth.uid() = user_id);
```

---

## Local Development

```bash
npm install
cp .env.example .env.local
# fill in env vars
npm run dev
```

---

## Deploying to Vercel

1. Push to GitHub (auto-deploys)
2. Set all env vars in Vercel → Project Settings → Environment Variables
3. Update Supabase redirect URL to your Vercel domain
4. Redeploy

---

## Business

Built by **Sitecraft** — premium AI websites for Alberta businesses.

- Email: hello@sitecraftai.com
- Pricing: /pricing
