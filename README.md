# RandyBuilds

**Paste your URL. Get a premium website preview. Instantly.**

RandyBuilds scrapes a business's existing site, extracts their branding (colors, logo, copy, services), then generates a shareable premium redesign preview powered by Claude 3.5 Sonnet. Conversion engine for a web-design agency.

---

## One-Click Deploy

[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/logicmastero/randybuilds&env=ANTHROPIC_API_KEY,SUPABASE_URL,SUPABASE_ANON_KEY,STRIPE_SECRET_KEY)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/logicmastero/randybuilds)

---

## Stack

- **Frontend / API:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + Framer Motion
- **AI:** Anthropic Claude 3.5 Sonnet (`@anthropic-ai/sdk`)
- **Scraping:** Cheerio (fast, serverless) + Puppeteer-core (heavy jobs, Railway worker)
- **Queue:** BullMQ + ioredis (for Puppeteer workers)
- **Auth + Storage:** Supabase
- **Payments:** Stripe
- **Hosting:** Vercel (web + light API) + Railway (Puppeteer workers + Redis)

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Agency homepage — hero with URL-input hook |
| `/api/scrape` | POST `{ url }` → returns `{ previewUrl, businessName, colors, logo, ... }` |
| `/api/redesign` | POST scraped data → Claude-written headline/subhead/CTA/services |
| `/preview/[slug]` | Shareable premium redesign preview |

---

## Local Dev

```bash
git clone https://github.com/logicmastero/randybuilds.git
cd randybuilds
npm install
cp .env.example .env.local  # fill in keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
REDIS_URL=redis://...    # Railway Redis, for Puppeteer queue
NODE_ENV=production
```

---

## Business Model

- **Hook preview (lead gen):** free — scrape + AI redesign, shareable link
- **Built site:** one-time $800–$2,500 via Stripe Checkout
- **Platform subscription (Vibe Coder):** $49–$199 / mo via Stripe Billing

---

Built by Randy. Audited by Comet. Shipped for Adam.
