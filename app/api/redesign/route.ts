import { NextRequest, NextResponse } from "next/server";
import { savePreview, isRedisConfigured } from "../../../lib/preview-store";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

interface ScrapedInput {
  businessName: string;
  description: string;
  services: string[];
  headline: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  colors: string[];
  logoUrl: string | null;
  images: string[];
  url: string;
}

interface RedesignCopy {
  headline: string;
  subhead: string;
  services: { title: string; desc: string }[];
  cta: string;
  ctaSecondary: string;
  closingHeadline: string;
}

// ─── Vertical detection ───────────────────────────────────────────────────────
// Returns both a vertical label AND a CTA default so copy is never generic

interface VerticalProfile {
  label: string;
  defaultCta: string;
  defaultCtaSecondary: string;
  systemPersona: string; // injected into Claude system prompt
}

function detectVertical(data: ScrapedInput): VerticalProfile {
  const text = [
    data.url,
    data.businessName,
    data.description,
    data.headline,
    ...(Array.isArray(data.services) ? data.services : []),
  ].join(" ").toLowerCase();

  const domain = (() => {
    try { return new URL(data.url).hostname.replace("www.", ""); } catch { return ""; }
  })();

  // ── Digital / SaaS / Tech ─────────────────────────────────────────────────

  // Domain-level overrides — prevent misclassification for major known brands
  if (/shopify\.com|bigcommerce\.com|woocommerce\.com|squarespace\.com|wix\.com/.test(domain))
    return { label: "e-commerce platform", defaultCta: "Start Free Trial", defaultCtaSecondary: "See All Features", systemPersona: "conversion copywriter for e-commerce platform companies selling to merchants" };

  if (/github\.com|gitlab\.com|bitbucket\.org/.test(domain))
    return { label: "developer tools / SaaS platform", defaultCta: "Start Building Free", defaultCtaSecondary: "Read the Docs", systemPersona: "conversion copywriter for developer-focused SaaS products" };

  if (/notion\.so|airtable\.com|coda\.io|monday\.com|clickup\.com|asana\.com|linear\.app/.test(domain))
    return { label: "developer tools / SaaS platform", defaultCta: "Get Started Free", defaultCtaSecondary: "See How It Works", systemPersona: "conversion copywriter for productivity and collaboration SaaS products" };

  // e-commerce check BEFORE fintech — "sell online" / "store" / "cart" shouldn't hit fintech
  if (/ecommerce|e-commerce|sell online|dropship|woocommerce|storefront|product catalog|shopping cart/.test(text))
    return { label: "e-commerce platform", defaultCta: "Start Free Trial", defaultCtaSecondary: "See All Features", systemPersona: "conversion copywriter for e-commerce platform companies selling to merchants" };

  // Fintech — only pure payment/billing, not ecommerce that touches "payment"
  if (/\bpayment gateway\b|\bcheckout sdk\b|\bpayment processing\b|\bbilling platform\b|\bmerchant services\b|\bpayroll\b|fintech|\bstripe\.com\b|square|paypal/.test(text))
    return { label: "fintech / payments platform", defaultCta: "Start for Free", defaultCtaSecondary: "View Pricing", systemPersona: "conversion copywriter for B2B SaaS and fintech products" };

  if (/saas|software platform|api platform|sdk|developer tool|dashboard|cloud infra|devops|ci\/cd|pipeline|repo|repository|open.?source|version control|continuous integration/.test(text))
    return { label: "developer tools / SaaS platform", defaultCta: "Start Building Free", defaultCtaSecondary: "Read the Docs", systemPersona: "conversion copywriter for developer-focused SaaS products" };

  // Generic shop/store — after domain overrides, catches local ecommerce
  if (/shop|store|product|cart|shipping/.test(text))
    return { label: "e-commerce platform", defaultCta: "Shop Now", defaultCtaSecondary: "See Collections", systemPersona: "conversion copywriter for e-commerce brands and online stores" };

  if (/marketing|seo|ads|ppc|email campaign|social media|content market|growth hack|demand gen/.test(text))
    return { label: "digital marketing agency / SaaS", defaultCta: "Get a Free Audit", defaultCtaSecondary: "See Case Studies", systemPersona: "conversion copywriter for digital marketing agencies and MarTech SaaS" };

  if (/design|agency|creative|branding|ux|ui|web design|motion|visual identity/.test(text))
    return { label: "creative / design agency", defaultCta: "See Our Work", defaultCtaSecondary: "Start a Project", systemPersona: "conversion copywriter for premium creative and design agencies" };

  if (/recruit|hiring|talent|staffing|job board|hr tech|people ops|workforce/.test(text))
    return { label: "HR tech / recruiting platform", defaultCta: "Post a Job Free", defaultCtaSecondary: "Browse Talent", systemPersona: "conversion copywriter for HR tech and recruiting platforms" };

  if (/health|medical|clinic|doctor|patient|telemedicine|ehr|hipaa|pharma|biotech/.test(text))
    return { label: "health tech / medical", defaultCta: "Book an Appointment", defaultCtaSecondary: "Learn More", systemPersona: "conversion copywriter for healthcare and health tech companies" };

  if (/education|learn|course|lms|training|bootcamp|tutor|university|curriculum/.test(text))
    return { label: "education / e-learning", defaultCta: "Start Learning Free", defaultCtaSecondary: "View Courses", systemPersona: "conversion copywriter for edtech and online education platforms" };

  if (/analytic|data|intelligence|insight|dashboard|report|metric|warehouse|bi tool/.test(text))
    return { label: "data / analytics platform", defaultCta: "Try It Free", defaultCtaSecondary: "View Demo", systemPersona: "conversion copywriter for data analytics and business intelligence platforms" };

  if (/security|cyber|compliance|soc 2|pentest|firewall|endpoint|zero trust|identity/.test(text))
    return { label: "cybersecurity / compliance", defaultCta: "Get a Security Audit", defaultCtaSecondary: "See the Platform", systemPersona: "conversion copywriter for cybersecurity and compliance companies" };

  if (/invest|trading|stock|portfolio|wealth|asset|fund|crypto|defi|blockchain/.test(text))
    return { label: "fintech / investing", defaultCta: "Start Investing", defaultCtaSecondary: "View Plans", systemPersona: "conversion copywriter for fintech investing and trading platforms" };

  if (/real estate|realt|mortgage|property|homes for sale|mls|listing/.test(text))
    return { label: "real estate", defaultCta: "Browse Listings", defaultCtaSecondary: "Talk to an Agent", systemPersona: "conversion copywriter for real estate agencies and property platforms" };

  // ── Equipment rental / power / generators ────────────────────────────────
  if (/generator|temp power|temporary power|power rental|equipment rental|light tower|fuel tank|transformer rental|power distribution/.test(text))
    return { label: "equipment rental & temporary power", defaultCta: "Get a Quote", defaultCtaSecondary: "View Fleet", systemPersona: "conversion copywriter for heavy equipment rental and temporary power companies serving construction and industrial job sites" };

  // ── Local trades ──────────────────────────────────────────────────────────
  if (/plumb|pipe|drain|sewer|water heater/.test(text))
    return { label: "plumbing contractor", defaultCta: "Book a Free Estimate", defaultCtaSecondary: "Call Us Now", systemPersona: "conversion copywriter for local home service contractors" };

  if (/electr|wiring|panel|breaker|outlet/.test(text))
    return { label: "electrical contractor", defaultCta: "Request a Free Quote", defaultCtaSecondary: "Our Services", systemPersona: "conversion copywriter for local home service contractors" };

  if (/roof|shingle|gutter|skylight/.test(text))
    return { label: "roofing contractor", defaultCta: "Get a Free Inspection", defaultCtaSecondary: "See Our Work", systemPersona: "conversion copywriter for local home service contractors" };

  if (/hvac|furnace|air condition|heat pump/.test(text))
    return { label: "HVAC contractor", defaultCta: "Schedule a Service Call", defaultCtaSecondary: "View Services", systemPersona: "conversion copywriter for local home service contractors" };

  if (/landscap|lawn|garden|sod|irrigation/.test(text))
    return { label: "landscaping company", defaultCta: "Get a Free Quote", defaultCtaSecondary: "View Our Work", systemPersona: "conversion copywriter for local home service contractors" };

  if (/clean|maid|janitorial|pressure wash/.test(text))
    return { label: "cleaning service", defaultCta: "Book a Clean", defaultCtaSecondary: "See Pricing", systemPersona: "conversion copywriter for local home service contractors" };

  if (/construct|build|contractor|renovation|remodel/.test(text))
    return { label: "general contractor / construction", defaultCta: "Start Your Project", defaultCtaSecondary: "View Portfolio", systemPersona: "conversion copywriter for local home service contractors" };

  if (/auto|car|vehicle|mechanic|tire|oil change/.test(text))
    return { label: "automotive service", defaultCta: "Book a Service", defaultCtaSecondary: "View Specials", systemPersona: "conversion copywriter for automotive service businesses" };

  if (/restaurant|cafe|food|menu|catering|diner/.test(text))
    return { label: "restaurant / food service", defaultCta: "View Our Menu", defaultCtaSecondary: "Reserve a Table", systemPersona: "conversion copywriter for restaurants and food service businesses" };

  if (/dental|dentist|teeth|orthodont/.test(text))
    return { label: "dental practice", defaultCta: "Book an Appointment", defaultCtaSecondary: "Meet Our Team", systemPersona: "conversion copywriter for dental and healthcare practices" };

  if (/legal|lawyer|attorney|law firm/.test(text))
    return { label: "law firm", defaultCta: "Schedule a Consultation", defaultCtaSecondary: "Our Practice Areas", systemPersona: "conversion copywriter for law firms and legal services" };

  if (/gym|fitness|personal train|yoga|crossfit/.test(text))
    return { label: "fitness / gym", defaultCta: "Start Your Free Trial", defaultCtaSecondary: "View Memberships", systemPersona: "conversion copywriter for fitness studios and gyms" };

  if (/salon|hair|barber|beauty|nail/.test(text))
    return { label: "beauty salon / barbershop", defaultCta: "Book an Appointment", defaultCtaSecondary: "See Services", systemPersona: "conversion copywriter for beauty and salon businesses" };

  if (/weld|fabricat|metal|steel|pipe fit/.test(text))
    return { label: "welding & fabrication", defaultCta: "Request a Quote", defaultCtaSecondary: "View Our Work", systemPersona: "conversion copywriter for industrial fabrication and trades businesses" };

  if (/tow|roadside|recovery/.test(text))
    return { label: "towing & roadside service", defaultCta: "Call for Immediate Help", defaultCtaSecondary: "Our Services", systemPersona: "conversion copywriter for local home service contractors" };

  if (/photo|videograph|portrait|wedding film/.test(text))
    return { label: "photography / videography", defaultCta: "Book a Session", defaultCtaSecondary: "View Portfolio", systemPersona: "conversion copywriter for creative photographers and videographers" };

  if (/accounting|bookkeep|tax|cpa|financial advis/.test(text))
    return { label: "accounting & financial services", defaultCta: "Book a Free Consultation", defaultCtaSecondary: "Our Services", systemPersona: "conversion copywriter for accounting and financial service firms" };

  // ── Catch-all based on domain signals ─────────────────────────────────────
  // If the business has no phone/address it's likely digital-first
  if (!data.phone && !data.address) {
    return { label: "digital product or SaaS company", defaultCta: "Get Started Free", defaultCtaSecondary: "See How It Works", systemPersona: "conversion copywriter for digital products, SaaS, and online businesses" };
  }

  return { label: "local service business", defaultCta: "Get a Free Quote", defaultCtaSecondary: "Learn More", systemPersona: "conversion copywriter for local service businesses" };
}

// ─── Claude copy generation ───────────────────────────────────────────────────

// ── Single Claude attempt — separated so retry logic can call it cleanly ─────
async function callClaude(
  client: Anthropic,
  data: ScrapedInput,
  vertical: VerticalProfile,
): Promise<RedesignCopy> {
  const hasServices = (Array.isArray(data.services) ? data.services : []).filter((s: unknown) => typeof s === "string" && (s as string).length > 3).length > 0;
  const servicesText = hasServices
    ? (Array.isArray(data.services) ? data.services : []).filter((s: unknown) => typeof s === "string" && (s as string).length > 3).join(", ")
    : "Not found on page — infer from business type and description";

  const systemPrompt = `You are a world-class ${vertical.systemPersona}. You write copy that is sharp, specific, and converts. You never use generic filler phrases. You understand that ${vertical.label} businesses have a specific audience with specific needs, and you write directly to that audience's outcome.

Output strict JSON only. No markdown, no explanation, no wrapper text. Just the raw JSON object.`;

  const userPrompt = `Write premium, vertical-appropriate copy for this ${vertical.label} website redesign.

Business name: ${data.businessName}
Vertical / industry: ${vertical.label}
URL: ${data.url}
Business description / user input: ${data.description || "Not provided"}
Page H1 / main headline: ${data.headline || "Not provided"}
Features/services found: ${servicesText}
Location: ${data.address || "Not specified — assume digital/online if blank"}
Has phone number: ${data.phone ? "Yes" : "No"}

CRITICAL RULES:
1. The headline must NOT contain the business name. Write a benefit-driven outcome statement appropriate for ${vertical.label}.
2. HEADLINE LANGUAGE: For equipment rental/generator/power verticals, use field/job site language ONLY. Examples: "Power for every job site." "Ready when your job starts." "Temporary power, done right." NEVER use photography, sports, or camera metaphors (shot, capture, aim, lens, focus).
3. The subhead is ONE specific sentence (max 18 words) that speaks to the TARGET USER of a ${vertical.label} — not generic.
3. Every service/feature title must be rewritten to be punchy and outcome-focused for ${vertical.label}.
4. Each service description must be UNIQUE and SPECIFIC to that particular service — do NOT repeat the same line.
5. The CTA must be appropriate for ${vertical.label}. Suggested: "${vertical.defaultCta}" — but improve it if you can.
6. Tone: confident, credible, specific. Zero generic phrases like "trusted by locals" or "quality you can count on" unless this is a local trade business.
7. If this is a SaaS/tech/fintech company, the copy must speak to developers, operators, or business buyers — NOT homeowners or local customers.

Return ONLY this JSON structure (no markdown, no wrapper):
{
  "headline": "4-8 word benefit-driven headline, no business name",
  "subhead": "One sentence, ${vertical.label}-specific, max 18 words",
  "services": [
    { "title": "Punchy rewritten feature/service title", "desc": "Unique outcome-focused sentence, max 15 words" }
  ],
  "cta": "3-5 word primary CTA for ${vertical.label}",
  "ctaSecondary": "3-5 word secondary CTA",
  "closingHeadline": "5-8 word closing headline that makes the target user want to act"
}

Write exactly ${Math.max((Array.isArray(data.services) ? data.services : []).filter(s => typeof s === "string" && s.length > 3).length, 3)} service objects. If fewer than 3 services were found, invent the most likely core features/offerings for a ${vertical.label}.`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
  console.log(`[redesign] Claude raw (first 300): ${raw.slice(0, 300)}`);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in Claude response");

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.headline || !parsed.subhead || !parsed.cta) throw new Error("Claude JSON missing required fields");

  const fb = buildFallbackCopy(data, vertical);
  return {
    headline:        parsed.headline,
    subhead:         parsed.subhead,
    services:        (Array.isArray(parsed.services) && parsed.services.length > 0 && parsed.services.every((s: any) => s && typeof s.title === 'string' && typeof s.desc === 'string')) ? parsed.services : fb.services,
    cta:             parsed.cta,
    ctaSecondary:    parsed.ctaSecondary || vertical.defaultCtaSecondary,
    closingHeadline: parsed.closingHeadline || fb.closingHeadline,
  };
}

async function generateRedesignCopy(
  data: ScrapedInput
): Promise<{ copy: RedesignCopy; source: "claude" | "fallback"; reason?: string }> {
  // ANTHROPIC_API_KEY_NEW is the active key; fall back to legacy name for safety
  const apiKey = process.env.ANTHROPIC_API_KEY_NEW ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("[redesign] ANTHROPIC_API_KEY_NEW (and fallback ANTHROPIC_API_KEY) not set — using template fallback");
    return { copy: buildFallbackCopy(data), source: "fallback", reason: "no_api_key" };
  }

  const vertical = detectVertical(data);
  console.log(`[redesign] Vertical: "${vertical.label}" | ${data.businessName} | desc:${data.description.length}c headline:"${data.headline.slice(0,50)}" services:${Array.isArray(data.services) ? data.services.length : 0}`);
  console.log(`[redesign] Key: present=${!!apiKey} len=${apiKey.length} prefix=${apiKey.slice(0,20)}`);

  const client = new Anthropic({ apiKey });

  // Attempt with 1 retry on 5xx/network errors — fast-fail on 401/403 (bad key, no point retrying)
  let lastError = "";
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const copy = await callClaude(client, data, vertical);
      console.log(`[redesign] ✓ Claude success (attempt ${attempt}) — headline: "${copy.headline}"`);
      return { copy, source: "claude" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      console.error(`[redesign] Claude attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg.slice(0, 200)}`);

      // 401/403 = bad key — no point retrying, fail fast for UX
      const isAuthError = msg.includes("401") || msg.includes("403") ||
        msg.includes("authentication_error") || msg.includes("invalid x-api-key") ||
        msg.includes("permission_error");
      if (isAuthError) {
        console.error("[redesign] Auth error — fast-failing, no retry");
        break;
      }

      // Only retry on 5xx / network / timeout
      const isRetryable = msg.includes("5") && /50[0-9]/.test(msg) ||
        msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("fetch");
      if (!isRetryable || attempt === MAX_ATTEMPTS) break;

      console.log(`[redesign] Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.error(`[redesign] All Claude attempts failed — falling back. Last error: ${lastError}`);
  return { copy: buildFallbackCopy(data, vertical), source: "fallback", reason: lastError };
}

// ─── Fallback copy (vertical-aware) ──────────────────────────────────────────

function buildFallbackCopy(data: ScrapedInput, vertical?: VerticalProfile): RedesignCopy {
  const v = vertical || detectVertical(data);
  const services = (Array.isArray(data.services) ? data.services : []).filter(s => typeof s === "string" && s.length > 3);
  const serviceItems = services.length > 0
    ? services.map((s, i) => ({
        title: s,
        // Rotate descriptions so they're not all identical
        desc: [
          "Built to deliver real results for your customers.",
          "Designed to work harder, so your team doesn't have to.",
          "The reliable foundation your business depends on.",
          "Crafted with precision for the people who use it most.",
          "Where quality work meets consistent delivery.",
          "Trusted by teams who can't afford to get it wrong.",
        ][i % 6],
      }))
    : [
        { title: "Core Product",   desc: "Purpose-built for the exact needs of your customers." },
        { title: "Integrations",   desc: "Connects with the tools your team already depends on." },
        { title: "Expert Support", desc: "Real people who know the product inside and out." },
      ];

  // Smart subhead — use real meta description if available (truncated cleanly),
  // otherwise fall back to vertical-specific line. Never use the generic "purpose-built" template.
  const rawDesc = (data.description || "").trim();
  let subhead: string;
  if (rawDesc.length >= 25) {
    // Collect complete sentences up to 140 chars.
    // If first sentence alone is over 140, keep it whole (better than mid-word cut).
    // If absurdly long (200+), hard-cut at last space before 140.
    const sentences = rawDesc.match(/[^.!?]+[.!?]+/g) ?? [];
    if (sentences.length > 0) {
      let built = "";
      for (const s of sentences) {
        const candidate = (built + s).trim();
        if (candidate.length <= 140) {
          built = candidate;
        } else if (built.length === 0) {
          // First sentence too long — keep whole if ≤200 chars, otherwise hard-cut
          built = s.trim().length <= 200
            ? s.trim()
            : s.slice(0, 140).replace(/\s\S*$/, "").trim() + ".";
          break;
        } else {
          break;
        }
      }
      subhead = built.trim();
    } else {
      // No sentence punctuation — hard-cut at last word boundary before 140
      subhead = rawDesc.length <= 140
        ? rawDesc
        : rawDesc.slice(0, 140).replace(/\s\S*$/, "").trim() + ".";
    }
    if (subhead && !/[.!?]$/.test(subhead)) subhead += ".";
  } else {
    // Vertical-specific fallback lines — no generic copy
    const verticalSubheads: Record<string, string> = {
      "fintech / payments platform":    "Accept payments globally with enterprise-grade security and developer-first APIs.",
      "e-commerce platform":            "Launch, manage, and scale your online store with one powerful platform.",
      "developer tools / saas platform":"Ship faster with purpose-built tools trusted by engineering teams worldwide.",
      "digital marketing agency / saas":"Data-driven campaigns that turn ad spend into measurable, repeatable growth.",
      "creative / design agency":       "Design that makes people stop scrolling and start paying attention.",
      "plumbing contractor":            "Licensed plumbers who show up on time and get it fixed right the first time.",
      "roofing contractor":             "Certified roofers protecting homes across the region — built to last decades.",
      "electrical contractor":          "Code-compliant electrical work completed safely, on schedule, and on budget.",
      "hvac contractor":                "Heating and cooling systems installed and serviced by certified technicians.",
      "general contractor / construction": "Quality builds delivered on time, on budget, by tradespeople who take pride in it.",
      "local service business":         "Serving the community with work that speaks for itself — every single job.",
    };
    const labelKey = v.label.toLowerCase();
    subhead = Object.entries(verticalSubheads).find(([k]) => labelKey.includes(k.split("/")[0].trim()))?.[1]
      ?? `${data.businessName} — built for the people who depend on it.`;
  }

  // Vertical-aware headline — not generic "Built for X."
  const verticalHeadlines: Record<string, string> = {
    "fintech":        "Payments that just work.",
    "e-commerce":     "Your store. Fully under control.",
    "developer":      "Build faster. Ship with confidence.",
    "marketing":      "Campaigns that actually convert.",
    "design":         "Work that makes people stop.",
    "plumbing":       "Fixed right. The first time.",
    "roofing":        "Built to handle whatever comes.",
    "electrical":     "Safe, code-compliant, done right.",
    "hvac":           "Comfort, year-round.",
    "construction":   "Built stronger. Built to last.",
    "local":          "Quality work. Zero drama.",
  };
  const hlKey = v.label.toLowerCase();
  const headline = Object.entries(verticalHeadlines).find(([k]) => hlKey.includes(k))?.[1]
    ?? `Built for ${v.label.split("/")[0].trim().charAt(0).toUpperCase() + v.label.split("/")[0].trim().slice(1)}.`;

  return {
    headline,
    subhead,
    services: serviceItems,
    cta: v.defaultCta,
    ctaSecondary: v.defaultCtaSecondary,
    closingHeadline: "Ready to take the next step?",
  };
}

// ─── Preview HTML builder ─────────────────────────────────────────────────────

function buildPreviewHTML(data: ScrapedInput, copy: RedesignCopy, source: "claude" | "fallback"): string {
  const images = (data as ScrapedInput & { images?: string[] }).images ?? [];
  const img0 = images[0] ?? null;
  const img1 = images[1] ?? null;
  const img2 = images[2] ?? null;
  const img3 = images[3] ?? null;
  const img4 = images[4] ?? null;

  // ── Brand color ─────────────────────────────────────────────────────────
  const rawColor = (data.colors?.[0] || "#c8a96e").replace("#","");
  const cr = parseInt(rawColor.slice(0,2)||"c8",16);
  const cg = parseInt(rawColor.slice(2,4)||"a9",16);
  const cb = parseInt(rawColor.slice(4,6)||"6e",16);
  const lum = (0.299*cr + 0.587*cg + 0.114*cb) / 255;
  // Reject colors too bright, too dark, or too grey
  const sat = Math.max(cr,cg,cb) - Math.min(cr,cg,cb);
  const accent = (lum > 0.82 || lum < 0.06 || sat < 30)
    ? "#c8a96e" : (data.colors?.[0] || "#c8a96e");
  const accentR = parseInt(accent.replace("#","").slice(0,2),16);
  const accentG = parseInt(accent.replace("#","").slice(2,4),16);
  const accentB = parseInt(accent.replace("#","").slice(4,6),16);

  const domain = (() => { try { return new URL(data.url).hostname.replace("www.",""); } catch { return data.url || ""; } })();
  const year = new Date().getFullYear();
  const services = Array.isArray(copy.services) ? copy.services.filter(s => s?.title) : [];
  const phoneHref = data.phone ? `tel:${data.phone.replace(/\D/g,"")}` : "#contact";
  const contactHref = data.email ? `mailto:${data.email}` : (data.phone ? phoneHref : "#contact");
  const ctaHref = data.phone ? phoneHref : contactHref;

  // ── Logo / wordmark ──────────────────────────────────────────────────────
  const navBrand = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="brand-img" onerror="this.style.display='none';document.querySelectorAll('.brand-txt').forEach(e=>e.style.display='block')" /><span class="brand-txt" style="display:none">${data.businessName}</span>`
    : `<span class="brand-txt">${data.businessName}</span>`;

  const heroBrand = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="hero-brand-img" onerror="this.style.display='none';document.querySelectorAll('.hero-brand-txt').forEach(e=>e.style.display='block')" /><h1 class="hero-brand-txt" style="display:none">${data.businessName}</h1>`
    : `<h1 class="hero-brand-txt">${data.businessName}</h1>`;

  // ── Ticker ───────────────────────────────────────────────────────────────
  const tickerItems = [...services.map(s=>s.title), data.businessName, copy.cta, domain.toUpperCase()];
  const tickerHtml = [...tickerItems,...tickerItems,...tickerItems]
    .map(t=>`<span class="ticker-item">${t}<span class="ticker-dot"> ✦</span></span>`).join("");

  // ── Service rows ─────────────────────────────────────────────────────────
  const serviceRows = services.map((s, i) => {
    const rowImg = [img1,img2,img3,img4][i] ?? null;
    const num = String(i+1).padStart(2,"0");
    return `
    <div class="svc-row" tabindex="0">
      <div class="svc-row-inner">
        <span class="svc-num">${num}</span>
        <h3 class="svc-title">${s.title}</h3>
        <p class="svc-desc">${s.desc}</p>
        ${rowImg
          ? `<div class="svc-thumb"><img src="${rowImg}" alt="${s.title}" loading="lazy" onerror="this.closest('.svc-thumb').style.display='none'" /></div>`
          : `<div class="svc-thumb-line"></div>`}
      </div>
    </div>`;
  }).join("");

  // ── Phone display ────────────────────────────────────────────────────────
  const phoneDisplay = data.phone
    ? `<a href="${phoneHref}" class="phone-chip"><span class="phone-icon">📞</span>${data.phone}</a>`
    : "";

  // ── Stat block — always-visible trust signals ────────────────────────────
  const statBlock = `
    <div class="stats-strip">
      <div class="stat-item">
        <span class="stat-n">100%</span>
        <span class="stat-l">Satisfaction guaranteed</span>
      </div>
      <div class="stat-div"></div>
      <div class="stat-item">
        <span class="stat-n">${data.address ? "Local" : "Fast"}</span>
        <span class="stat-l">${data.address ? data.address.split(",")[0] + " based" : "Response time"}</span>
      </div>
      <div class="stat-div"></div>
      <div class="stat-item">
        <span class="stat-n">5★</span>
        <span class="stat-l">Client rated</span>
      </div>
    </div>`;

  // ── Reviews (placeholder — always shown) ────────────────────────────────
  const reviews = [
    { initial:"M", name:"Mike R.", quote:"Best in the business. Called at 7am, they were there by 9. Clean work, fair price. I'm not going anywhere else." },
    { initial:"S", name:"Sandra T.", quote:"Professional from the first call to the final walkthrough. You can tell they actually care about doing it right." },
    { initial:"D", name:"Dave K.", quote:"Had three other quotes. Went with these guys because their site looked legit — glad I did. Outstanding work." },
  ];
  const reviewCards = reviews.map(r => `
    <div class="review-card">
      <div class="review-stars">★★★★★</div>
      <p class="review-text">"${r.quote}"</p>
      <div class="review-author"><span class="review-av">${r.initial}</span><span class="review-name">${r.name}</span></div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>${data.businessName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500&display=swap" rel="stylesheet" />
<style>

/* ─── RESET ──────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  background: #0c0c0a;
  color: #ede8df;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-weight: 300;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
img { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
button { background: none; border: none; cursor: pointer; }

/* ─── CSS CUSTOM PROPERTIES ─────────────────────────────────────────── */
:root {
  --accent: ${accent};
  --accent-rgb: ${accentR}, ${accentG}, ${accentB};
  --bg: #0c0c0a;
  --bg-2: #111110;
  --bg-3: #161614;
  --text: #ede8df;
  --text-dim: rgba(237,232,223,.5);
  --text-faint: rgba(237,232,223,.2);
  --border: rgba(237,232,223,.07);
  --serif: 'Instrument Serif', Georgia, serif;
  --sans: 'Syne', system-ui, sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --ease-out: cubic-bezier(.16, 1, .3, 1);
}

/* ─── CURSOR (desktop only) ─────────────────────────────────────────── */
@media (pointer: fine) {
  body { cursor: none; }
  a, button, [tabindex] { cursor: none; }
  #cur-dot {
    position: fixed; pointer-events: none; z-index: 9999;
    width: 6px; height: 6px; background: #fff; border-radius: 50%;
    transform: translate(-50%, -50%);
    mix-blend-mode: difference;
    transition: width .15s, height .15s;
  }
  #cur-ring {
    position: fixed; pointer-events: none; z-index: 9998;
    width: 36px; height: 36px; border: 1px solid rgba(255,255,255,.3);
    border-radius: 50%; transform: translate(-50%, -50%);
    mix-blend-mode: difference;
    transition: width .3s var(--ease-out), height .3s var(--ease-out);
  }
  body.cursor-hover #cur-dot { width: 10px; height: 10px; }
  body.cursor-hover #cur-ring { width: 56px; height: 56px; }
}

/* ─── SCROLL ANIMATIONS ─────────────────────────────────────────────── */
.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity .75s var(--ease-out), transform .75s var(--ease-out);
}
.reveal.in { opacity: 1; transform: none; }
.reveal-left { opacity: 0; transform: translateX(-22px); transition: opacity .75s var(--ease-out), transform .75s var(--ease-out); }
.reveal-left.in { opacity: 1; transform: none; }
.reveal-scale { opacity: 0; transform: scale(.97); transition: opacity .75s var(--ease-out), transform .75s var(--ease-out); }
.reveal-scale.in { opacity: 1; transform: none; }

/* stagger helpers */
.d1 { transition-delay: .05s; }
.d2 { transition-delay: .12s; }
.d3 { transition-delay: .19s; }
.d4 { transition-delay: .26s; }

/* ─── KEYFRAME ANIMATIONS ────────────────────────────────────────────── */
@keyframes fade-up { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(7px)} }
@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(var(--accent-rgb),.3)} 70%{box-shadow:0 0 0 14px rgba(var(--accent-rgb),0)} 100%{box-shadow:0 0 0 0 rgba(var(--accent-rgb),0)} }

/* ─── NAV ────────────────────────────────────────────────────────────── */
#nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 500;
  display: flex; align-items: center; justify-content: space-between;
  padding: 30px 52px;
  transition: padding .4s var(--ease-out), background .4s, border-color .4s;
  border-bottom: 1px solid transparent;
}
#nav.nav-compact {
  padding: 17px 52px;
  background: rgba(12,12,10,.9);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-color: var(--border);
}
.brand-img { height: 30px; width: auto; filter: brightness(0) invert(1); object-fit: contain; }
.brand-txt { font-family: var(--sans); font-size: .95rem; font-weight: 700; letter-spacing: -.01em; }
.nav-right { display: flex; align-items: center; gap: 40px; }
.nav-link { font-family: var(--sans); font-size: .72rem; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: var(--text-dim); transition: color .2s; }
.nav-link:hover { color: var(--text); }
.nav-cta {
  font-family: var(--sans); font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  padding: 10px 24px; border-radius: 100px; background: var(--accent); color: #0c0c0a;
  transition: opacity .15s, transform .2s;
}
.nav-cta:hover { opacity: .88; transform: translateY(-1px); }
@media (max-width: 768px) {
  #nav { padding: 20px 24px; }
  #nav.nav-compact { padding: 14px 24px; }
  .nav-link { display: none; }
  .nav-right { gap: 16px; }
}

/* ─── HERO ───────────────────────────────────────────────────────────── */
.hero {
  min-height: 100svh; position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 52px 56px;
}
.hero-bg {
  position: absolute; inset: 0; z-index: 0;
  ${img0
    ? `background: url(${img0}) center/cover no-repeat;`
    : `background: radial-gradient(ellipse 120% 80% at 60% 40%, rgba(var(--accent-rgb),.06) 0%, var(--bg) 70%);`
  }
}
.hero-overlay {
  position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(170deg, rgba(12,12,10,.6) 0%, rgba(12,12,10,.35) 35%, rgba(12,12,10,.78) 70%, var(--bg) 100%);
}
/* Noise grain texture */
.hero-noise {
  position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: .025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.hero-eyebrow {
  position: relative; z-index: 3;
  font-family: var(--sans); font-size: .68rem; font-weight: 600; letter-spacing: .18em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 28px;
  display: flex; align-items: center; gap: 14px;
  animation: fade-in .8s ease both;
}
.hero-eyebrow::before { content: ''; display: block; width: 28px; height: 1px; background: var(--accent); }
.hero-brand-img {
  position: relative; z-index: 3;
  height: clamp(60px, 9vw, 110px); width: auto; max-width: 500px;
  object-fit: contain; object-position: left bottom;
  filter: brightness(0) invert(1);
  margin-bottom: 40px;
  animation: fade-up .9s var(--ease-out) .08s both;
}
.hero-brand-txt {
  position: relative; z-index: 3;
  font-family: var(--serif);
  font-size: clamp(3.2rem, 8.5vw, 9rem);
  font-weight: 400; font-style: italic;
  line-height: .92; letter-spacing: -.035em;
  color: var(--text);
  margin-bottom: 36px;
  animation: fade-up .9s var(--ease-out) .08s both;
}
.hero-headline {
  position: relative; z-index: 3;
  font-family: var(--serif);
  font-size: clamp(2.4rem, 5.8vw, 6.5rem);
  font-weight: 400; line-height: 1.02; letter-spacing: -.03em;
  color: var(--text); max-width: 860px;
  animation: fade-up 1s var(--ease-out) .15s both;
}
.hero-headline em { font-style: italic; color: var(--accent); }
.hero-bottom {
  position: relative; z-index: 3;
  margin-top: 52px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; flex-wrap: wrap;
}
.hero-left { display: flex; flex-direction: column; gap: 28px; max-width: 400px; animation: fade-in 1s ease .32s both; }
.hero-sub { font-size: clamp(.85rem, 1.4vw, 1rem); color: var(--text-dim); line-height: 1.8; font-weight: 300; }
.hero-actions { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.hero-right { animation: fade-in 1s ease .4s both; }
.scroll-cue {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  font-family: var(--sans); font-size: .62rem; letter-spacing: .14em; text-transform: uppercase;
  color: var(--text-faint); animation: bob 2.8s ease-in-out infinite;
}
.scroll-cue::before { content: ''; width: 1px; height: 48px; background: linear-gradient(var(--text-faint), transparent); }
@media (max-width: 768px) {
  .hero { padding: 0 24px 48px; }
  .hero-bottom { flex-direction: column; align-items: flex-start; }
  .hero-right { display: none; }
}

/* ─── BUTTONS ────────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 15px 30px; border-radius: 100px;
  background: var(--accent); color: #0c0c0a;
  font-family: var(--sans); font-size: .78rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  transition: transform .2s var(--ease-out), box-shadow .2s, opacity .15s;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 36px rgba(var(--accent-rgb), .32); }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 28px; border-radius: 100px; border: 1px solid var(--border);
  font-family: var(--sans); font-size: .78rem; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  color: var(--text-dim); transition: border-color .2s, color .2s;
}
.btn-ghost:hover { border-color: rgba(237,232,223,.35); color: var(--text); }
.phone-chip {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--sans); font-size: .9rem; font-weight: 500;
  color: var(--text); letter-spacing: -.01em;
}
.phone-icon { font-size: .9rem; }

/* ─── TICKER ─────────────────────────────────────────────────────────── */
.ticker-wrap {
  overflow: hidden; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  padding: 16px 0; background: #0a0a08;
}
.ticker-track { display: flex; width: max-content; animation: marquee 28s linear infinite; will-change: transform; }
.ticker-item {
  display: inline-flex; align-items: center;
  padding: 0 32px; white-space: nowrap;
  font-family: var(--sans); font-size: .66rem; font-weight: 600; letter-spacing: .15em; text-transform: uppercase;
  color: var(--text-faint);
}
.ticker-dot { color: var(--accent); margin-left: 4px; opacity: .7; }

/* ─── SECTION SHARED ─────────────────────────────────────────────────── */
.section { max-width: 1360px; margin: 0 auto; padding: 0 52px; }
.section-label {
  font-family: var(--sans); font-size: .66rem; font-weight: 600; letter-spacing: .16em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 20px;
}
.section-h2 {
  font-family: var(--serif); font-size: clamp(2rem, 4vw, 3.8rem); font-weight: 400; line-height: 1.1; letter-spacing: -.025em;
  color: var(--text);
}
.section-h2 em { font-style: italic; color: var(--text-dim); }
.divider { border: none; border-top: 1px solid var(--border); margin: 0; }
@media (max-width: 768px) { .section { padding: 0 24px; } }

/* ─── STATEMENT ──────────────────────────────────────────────────────── */
.statement-wrap { border-bottom: 1px solid var(--border); padding: 140px 0; }
.statement-grid { display: grid; grid-template-columns: 200px 1fr; gap: 80px; align-items: start; }
.statement-aside { font-family: var(--sans); font-size: .66rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--text-faint); padding-top: 6px; }
.statement-body { font-family: var(--serif); font-size: clamp(1.6rem, 3.2vw, 2.8rem); font-weight: 400; line-height: 1.4; letter-spacing: -.02em; color: var(--text); }
.statement-body em { font-style: italic; color: var(--accent); }
@media (max-width: 768px) { .statement-wrap { padding: 80px 0; } .statement-grid { grid-template-columns: 1fr; gap: 20px; } }

/* ─── STATS STRIP ────────────────────────────────────────────────────── */
.stats-strip {
  display: flex; align-items: center; gap: 0;
  padding: 56px 52px; border-bottom: 1px solid var(--border);
  background: var(--bg-2);
}
.stat-item { flex: 1; padding: 0 40px 0 0; }
.stat-n { display: block; font-family: var(--sans); font-size: clamp(1.8rem, 3vw, 2.8rem); font-weight: 800; color: var(--text); letter-spacing: -.04em; line-height: 1; margin-bottom: 6px; }
.stat-l { font-size: .78rem; color: var(--text-dim); font-weight: 300; line-height: 1.4; }
.stat-div { width: 1px; height: 60px; background: var(--border); flex-shrink: 0; margin: 0 40px 0 0; }
@media (max-width: 640px) { .stats-strip { flex-direction: column; padding: 48px 24px; gap: 32px; } .stat-div { width: 100%; height: 1px; margin: 0; } .stat-item { padding: 0; } }

/* ─── SERVICES ───────────────────────────────────────────────────────── */
.svc-header {
  padding: 80px 52px 40px;
  display: flex; align-items: baseline; justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.svc-header-label { font-family: var(--sans); font-size: .66rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--text-faint); }
.svc-header-count { font-family: var(--sans); font-size: .66rem; letter-spacing: .1em; color: var(--text-faint); }
.svc-row {
  border-bottom: 1px solid var(--border); overflow: hidden; position: relative;
  transition: background .25s;
}
.svc-row:hover { background: rgba(237,232,223,.02); }
.svc-row:focus { outline: 1px solid var(--accent); outline-offset: -1px; background: rgba(237,232,223,.02); }
.svc-row-inner {
  display: grid; grid-template-columns: 72px 1fr 1fr 200px;
  align-items: center; gap: 0; padding: 32px 52px;
}
.svc-num { font-family: var(--sans); font-size: .62rem; font-weight: 700; letter-spacing: .1em; color: var(--text-faint); transition: color .25s; }
.svc-row:hover .svc-num, .svc-row:focus .svc-num { color: var(--accent); }
.svc-title {
  font-family: var(--serif); font-size: clamp(1.2rem, 2.2vw, 1.9rem); font-weight: 400; letter-spacing: -.02em; line-height: 1.1;
  color: var(--text); transition: color .25s;
}
.svc-row:hover .svc-title { color: var(--accent); }
.svc-desc { font-size: .84rem; color: var(--text-dim); line-height: 1.75; font-weight: 300; max-width: 300px; padding-right: 32px; }
.svc-thumb { width: 200px; height: 110px; border-radius: 6px; overflow: hidden; opacity: 0; transform: scale(.96); transition: opacity .35s var(--ease-out), transform .35s var(--ease-out); }
.svc-row:hover .svc-thumb { opacity: 1; transform: none; }
.svc-thumb img { width: 100%; height: 100%; object-fit: cover; }
.svc-thumb-line { width: 200px; height: 1px; background: var(--border); justify-self: end; }
@media (max-width: 900px) {
  .svc-row-inner { grid-template-columns: 48px 1fr; padding: 28px 24px; }
  .svc-desc, .svc-thumb, .svc-thumb-line { display: none; }
  .svc-header { padding: 64px 24px 32px; }
}

/* ─── FULL BLEED IMAGE ───────────────────────────────────────────────── */
.full-bleed { position: relative; height: clamp(300px, 55vh, 640px); overflow: hidden; }
.full-bleed img {
  width: 100%; height: 100%; object-fit: cover;
  filter: brightness(.65) saturate(.8);
  transform: scale(1.06);
  transition: transform 7s ease;
}
.full-bleed.in-view img { transform: none; }
.full-bleed-caption {
  position: absolute; bottom: 28px; right: 48px;
  font-family: var(--sans); font-size: .62rem; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.3);
}
@media (max-width: 768px) { .full-bleed-caption { right: 24px; } }

/* ─── SPLIT SECTION ──────────────────────────────────────────────────── */
.split { display: grid; grid-template-columns: 1fr 1fr; min-height: 580px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.split-media { overflow: hidden; position: relative; min-height: 380px; }
.split-media img { width: 100%; height: 100%; object-fit: cover; filter: brightness(.7) saturate(.8); }
.split-media-placeholder { width: 100%; height: 100%; background: var(--bg-3); display: flex; align-items: center; justify-content: center; }
.split-body { padding: 80px 72px; display: flex; flex-direction: column; justify-content: center; gap: 28px; }
.split-headline { font-family: var(--serif); font-size: clamp(1.9rem, 3.5vw, 3.2rem); font-weight: 400; line-height: 1.15; letter-spacing: -.025em; color: var(--text); }
.split-headline em { font-style: italic; color: var(--accent); }
.split-copy { font-size: .9rem; color: var(--text-dim); line-height: 1.85; font-weight: 300; max-width: 380px; }
.split-contact { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--border); padding-top: 28px; margin-top: 4px; }
.contact-row { display: flex; align-items: center; gap: 12px; font-size: .88rem; color: var(--text-dim); }
.contact-row strong { color: var(--text); font-weight: 500; min-width: 60px; }
.contact-row a { color: var(--accent); }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; } .split-body { padding: 56px 24px; } }

/* ─── REVIEWS ────────────────────────────────────────────────────────── */
.reviews-section { padding: 120px 0; border-bottom: 1px solid var(--border); }
.reviews-header { padding: 0 52px; margin-bottom: 56px; }
.reviews-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
.review-card { background: var(--bg); padding: 40px 44px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); transition: background .25s; }
.review-card:hover { background: var(--bg-2); }
.review-stars { font-size: .9rem; color: var(--accent); margin-bottom: 16px; letter-spacing: 2px; }
.review-text { font-family: var(--serif); font-size: 1.05rem; font-style: italic; line-height: 1.7; color: var(--text-dim); margin-bottom: 24px; }
.review-author { display: flex; align-items: center; gap: 12px; }
.review-av { width: 34px; height: 34px; border-radius: 50%; background: rgba(var(--accent-rgb), .12); border: 1px solid rgba(var(--accent-rgb), .25); display: flex; align-items: center; justify-content: center; font-family: var(--sans); font-size: .78rem; font-weight: 700; color: var(--accent); }
.review-name { font-size: .82rem; font-weight: 500; color: var(--text-dim); }
@media (max-width: 900px) { .reviews-grid { grid-template-columns: 1fr; } .reviews-header { padding: 0 24px; } .review-card { padding: 32px 24px; } }

/* ─── CTA SECTION ────────────────────────────────────────────────────── */
.cta-section {
  position: relative; overflow: hidden;
  padding: 140px 52px;
  display: flex; flex-direction: column; align-items: flex-start; gap: 32px;
  border-bottom: 1px solid var(--border);
}
.cta-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 70% at 80% 50%, rgba(var(--accent-rgb), .06) 0%, transparent 70%);
}
.cta-eyebrow { font-family: var(--sans); font-size: .68rem; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: var(--accent); position: relative; }
.cta-headline {
  font-family: var(--serif); font-size: clamp(2.4rem, 5.5vw, 6rem); font-weight: 400; line-height: 1.04; letter-spacing: -.03em;
  color: var(--text); max-width: 780px; position: relative;
}
.cta-headline em { font-style: italic; color: var(--accent); }
.cta-actions { display: flex; gap: 16px; flex-wrap: wrap; position: relative; }
@media (max-width: 768px) { .cta-section { padding: 96px 24px; } }

/* ─── FOOTER ─────────────────────────────────────────────────────────── */
footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 28px 52px;
  border-top: 1px solid var(--border);
  font-family: var(--sans); font-size: .7rem; letter-spacing: .05em; color: var(--text-faint);
}
.footer-brand { font-weight: 700; color: var(--text-dim); }
.footer-credit a { color: var(--accent); }
@media (max-width: 640px) { footer { flex-direction: column; gap: 10px; padding: 24px; text-align: center; } }

/* ─── STICKY CTA BAR ─────────────────────────────────────────────────── */
#sticky-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 600;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 48px;
  background: rgba(12,12,10,.96);
  backdrop-filter: blur(24px);
  border-top: 1px solid var(--border);
  transform: translateY(100%);
  transition: transform .4s var(--ease-out);
}
#sticky-bar.show { transform: none; }
.sbar-text { font-size: .85rem; color: var(--text-dim); }
.sbar-text strong { color: var(--text); font-weight: 600; }
.sbar-cta {
  font-family: var(--sans); font-size: .75rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  padding: 11px 26px; border-radius: 100px; background: var(--accent); color: #0c0c0a;
  white-space: nowrap; transition: opacity .15s; animation: pulse-ring 2.5s ease-in-out infinite;
}
.sbar-cta:hover { opacity: .85; animation: none; }
@media (max-width: 640px) { #sticky-bar { padding: 14px 20px; } .sbar-text { display: none; } }

/* ─── AI WATERMARK ───────────────────────────────────────────────────── */
.ai-watermark {
  position: fixed; top: 72px; right: 20px; z-index: 499;
  padding: 5px 11px; border-radius: 100px;
  border: 1px solid var(--border); background: rgba(12,12,10,.8);
  font-family: var(--sans); font-size: .6rem; font-weight: 500; letter-spacing: .07em;
  color: var(--text-faint);
}

</style>
</head>
<body>

<div id="cur-dot"></div>
<div id="cur-ring"></div>
<div class="ai-watermark">${source === "claude" ? "⚡ AI-generated" : "📋 Template"} — Sitecraft Preview</div>

<!-- ── NAV ─────────────────────────────────────────────────────────── -->
<nav id="nav">
  <a href="#top">${navBrand}</a>
  <div class="nav-right">
    ${data.phone ? `<a href="${phoneHref}" class="nav-link">${data.phone}</a>` : ""}
    <a href="#services" class="nav-link">Services</a>
    <a href="${ctaHref}" class="nav-cta">${copy.cta}</a>
  </div>
</nav>

<!-- ── HERO ────────────────────────────────────────────────────────── -->
<section class="hero" id="top">
  <div class="hero-bg"></div>
  <div class="hero-overlay"></div>
  <div class="hero-noise"></div>

  <div class="hero-eyebrow">${domain || data.businessName} · Est. ${year}</div>
  ${heroBrand}
  <h2 class="hero-headline">${copy.headline.replace(/(\S+)\s*$/, "<em>$1</em>")}</h2>

  <div class="hero-bottom">
    <div class="hero-left">
      <p class="hero-sub">${copy.subhead}</p>
      <div class="hero-actions">
        <a href="${ctaHref}" class="btn-primary">${copy.cta} →</a>
        <a href="#services" class="btn-ghost">Our Services</a>
      </div>
      ${phoneDisplay}
    </div>
    <div class="hero-right">
      <div class="scroll-cue">scroll</div>
    </div>
  </div>
</section>

<!-- ── TICKER ──────────────────────────────────────────────────────── -->
<div class="ticker-wrap" aria-hidden="true">
  <div class="ticker-track">${tickerHtml}</div>
</div>

<!-- ── STATEMENT / ABOUT ───────────────────────────────────────────── -->
<div class="statement-wrap" id="about">
  <div class="section">
    <div class="statement-grid">
      <span class="statement-aside reveal">About</span>
      <p class="statement-body reveal d1">${
        data.description
          ? data.description.slice(0, 240)
          : `${data.businessName} delivers work that holds — built with care, backed by experience, trusted by the people who depend on it.`
      } <em>${copy.closingHeadline}</em></p>
    </div>
  </div>
</div>

<!-- ── STATS ───────────────────────────────────────────────────────── -->
${statBlock}

<!-- ── SERVICES ────────────────────────────────────────────────────── -->
<div id="services" style="border-top:1px solid var(--border)">
  <div class="svc-header">
    <span class="svc-header-label">What we do</span>
    <span class="svc-header-count">(${String(services.length).padStart(2,"0")})</span>
  </div>
  ${serviceRows}
</div>

<!-- ── FULL BLEED ──────────────────────────────────────────────────── -->
${img0 ? `
<div class="full-bleed" id="full-bleed-1">
  <img src="${img0}" alt="${data.businessName}" loading="lazy" />
  <span class="full-bleed-caption">${data.businessName} · ${domain}</span>
</div>` : ""}

<!-- ── SPLIT: WHY US ───────────────────────────────────────────────── -->
<div class="split" id="why-us">
  <div class="split-media reveal-scale">
    ${img2
      ? `<img src="${img2}" alt="${data.businessName}" loading="lazy" />`
      : `<div class="split-media-placeholder" style="min-height:400px;background:linear-gradient(135deg,var(--bg-3),var(--bg-2))"></div>`
    }
  </div>
  <div class="split-body reveal d2">
    <span class="section-label">Why Us</span>
    <h2 class="split-headline">Built to last.<br><em>Backed by results.</em></h2>
    <p class="split-copy">${
      data.description
        ? data.description.slice(0, 180)
        : `Every job gets our full attention. We show up, we deliver, and we stand behind the work — no excuses, no runaround.`
    }</p>
    <div class="split-contact">
      ${data.phone ? `<div class="contact-row"><strong>Phone</strong><a href="${phoneHref}">${data.phone}</a></div>` : ""}
      ${data.email ? `<div class="contact-row"><strong>Email</strong><a href="mailto:${data.email}">${data.email}</a></div>` : ""}
      ${data.address ? `<div class="contact-row"><strong>Address</strong><span>${data.address}</span></div>` : ""}
    </div>
  </div>
</div>

<!-- ── REVIEWS ─────────────────────────────────────────────────────── -->
<div class="reviews-section">
  <div class="reviews-header reveal">
    <span class="section-label">What clients say</span>
    <h2 class="section-h2">Real work.<br><em>Real results.</em></h2>
  </div>
  <div class="reviews-grid">
    ${reviewCards}
  </div>
</div>

<!-- ── CLOSING CTA ─────────────────────────────────────────────────── -->
<section class="cta-section" id="contact">
  <div class="cta-glow"></div>
  <p class="cta-eyebrow reveal">Ready to start?</p>
  <h2 class="cta-headline reveal d1">${copy.closingHeadline.replace(/(\S+)\s*$/, "<em>$1</em>")}</h2>
  <div class="cta-actions reveal d2">
    <a href="${ctaHref}" class="btn-primary">${copy.cta} →</a>
    ${data.url && data.url !== "https://example.com" ? `<a href="${data.url}" target="_blank" rel="noopener" class="btn-ghost">Current Site ↗</a>` : ""}
  </div>
</section>

<!-- ── FOOTER ──────────────────────────────────────────────────────── -->
<footer>
  <span class="footer-brand">${data.businessName}</span>
  <span>${domain} · ${year}</span>
  <span class="footer-credit">Preview by <a href="https://sitecraftai.com" target="_blank">Sitecraft</a></span>
</footer>

<!-- ── STICKY BAR ──────────────────────────────────────────────────── -->
<div id="sticky-bar">
  <span class="sbar-text"><strong>Free preview.</strong> Your site could look like this — launched in 5 days.</span>
  <a href="https://sitecraftai.com" target="_blank" rel="noopener" class="sbar-cta">Get This Site →</a>
</div>

<script>
(function () {
  "use strict";

  // ── Custom cursor ─────────────────────────────────────
  const dot = document.getElementById("cur-dot");
  const ring = document.getElementById("cur-ring");
  if (dot && ring && window.matchMedia("(pointer:fine)").matches) {
    let mx=0,my=0,rx=0,ry=0,raf=null;
    const loop=()=>{rx+=(mx-rx)*.1;ry+=(my-ry)*.1;ring.style.left=rx+"px";ring.style.top=ry+"px";raf=requestAnimationFrame(loop)};
    document.addEventListener("mousemove",e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+"px";dot.style.top=my+"px"},{passive:true});
    document.addEventListener("mouseenter",()=>{if(!raf)loop()});
    document.querySelectorAll("a,button,[tabindex]").forEach(el=>{
      el.addEventListener("mouseenter",()=>document.body.classList.add("cursor-hover"));
      el.addEventListener("mouseleave",()=>document.body.classList.remove("cursor-hover"));
    });
    loop();
  }

  // ── Nav compact on scroll ─────────────────────────────
  const nav = document.getElementById("nav");
  const sbar = document.getElementById("sticky-bar");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        nav && nav.classList.toggle("nav-compact", y > 60);
        sbar && sbar.classList.toggle("show", y > window.innerHeight * 0.75);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // ── Scroll reveal ─────────────────────────────────────
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); } });
  }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
  document.querySelectorAll(".reveal, .reveal-left, .reveal-scale").forEach(el => io.observe(el));

  // ── Full bleed parallax ───────────────────────────────
  const fb = document.getElementById("full-bleed-1");
  if (fb) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fb.classList.add("in-view");
    }, { threshold: 0.1 }).observe(fb);
  }

  // ── Ticker infinite ───────────────────────────────────
  document.querySelectorAll(".ticker-track").forEach(t => {
    const clone = t.cloneNode(true);
    t.parentElement.appendChild(clone);
  });

})();
</script>

</body>
</html>

function generateSlug(businessName: string): string {
  // 8-char base62 from timestamp + random — short enough to text, unique enough to not collide
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  let slug = "";
  let n = hash;
  for (let i = 0; i < 8; i++) { slug = chars[n % 62] + slug; n = Math.floor(n / 62); }
  // Prefix with sanitized business name (max 20 chars) for readability
  const prefix = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 20);
  return `${prefix}-${slug}`;
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data: ScrapedInput = body.scraped ?? body;

    // Allow description-only mode: populate missing fields from description
    if (body.input && !data.description) {
      data.description = body.input;
    }
    if (!data.businessName && data.description) {
      data.businessName = data.description.split(/\s+/).slice(0, 4).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    if (!data.url || data.url === "https://example.com") {
      data.url = "https://example.com";
    }
    if (!data.businessName) {
      data.businessName = "Your Business";
    }
    // Normalize all array fields — prevent "is not iterable" crashes
    if (!Array.isArray(data.services)) data.services = [];
    if (!Array.isArray((data as any).images)) (data as any).images = [];
    if (!Array.isArray(data.colors)) data.colors = [];
    if (!data.headline) data.headline = "";
    if (!data.description) data.description = "";
    if (!data.phone) data.phone = null;
    if (!data.email) data.email = null;
    if (!data.address) data.address = null;
    if (!data.logoUrl) data.logoUrl = null;

    const { copy, source, reason } = await generateRedesignCopy(data);
    const html = buildPreviewHTML(data, copy, source);
    const slug = generateSlug(data.businessName);

    console.log(`[redesign] Saving preview slug="${slug}" source="${source}" redis=${isRedisConfigured()}`);

    await savePreview(slug, {
      html,
      businessName: data.businessName,
      url: data.url,
      source,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      previewUrl: `/preview/${slug}`,
      previewHtml: html,       // blob URL instant display — frontend uses this first
      businessName: data.businessName,
      slug,
      copy,
      source,
      fallbackReason: reason ?? null,
      aiPowered: source === "claude",
      persistedToRedis: isRedisConfigured(),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[redesign] Fatal error:", msg);
    return NextResponse.json({ error: "Failed to generate redesign", detail: msg }, { status: 500 });
  }
}



