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
    ...data.services,
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
  const hasServices = data.services.filter(s => s.length > 3).length > 0;
  const servicesText = hasServices
    ? data.services.filter(s => s.length > 3).join(", ")
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

Write exactly ${Math.max(data.services.filter(s => s.length > 3).length, 3)} service objects. If fewer than 3 services were found, invent the most likely core features/offerings for a ${vertical.label}.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
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
    services:        Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : fb.services,
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
  console.log(`[redesign] Vertical: "${vertical.label}" | ${data.businessName} | desc:${data.description.length}c headline:"${data.headline.slice(0,50)}" services:${data.services.length}`);
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
  const services = data.services.filter(s => s.length > 3);
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
  const img5 = images[5] ?? null;

  // Accent color from brand
  const raw = (data.colors[0] || "#e8e0d4").replace("#","");
  const ar = parseInt(raw.slice(0,2),16), ag = parseInt(raw.slice(2,4),16), ab = parseInt(raw.slice(4,6),16);
  const lum = (0.299*ar + 0.587*ag + 0.114*ab)/255;
  // If brand color is too dark or too close to white, use a warm off-white accent
  const accent = lum > 0.85 ? "#c8b89a" : lum < 0.08 ? "#c8b89a" : data.colors[0] || "#c8b89a";

  const domain = (() => { try { return new URL(data.url).hostname.replace("www.",""); } catch { return data.url; } })();
  const year = new Date().getFullYear();
  const services = copy.services;

  const phoneHref = data.phone ? `tel:${data.phone.replace(/\D/g,"")}` : "#contact";
  const contactHref = data.email ? `mailto:${data.email}` : data.phone ? phoneHref : "#contact";

  // Logo in nav
  const navLogo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="nav-logo-img" onerror="this.style.display='none';this.nextSibling.style.display='block'"><span class="nav-logo-txt" style="display:none">${data.businessName}</span>`
    : `<span class="nav-logo-txt">${data.businessName}</span>`;

  // Hero logo — large, proud, centered
  const heroLogo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="hero-logo" onerror="this.style.display='none';document.querySelector('.hero-wordmark').style.display='block'"><h1 class="hero-wordmark" style="display:none">${data.businessName}</h1>`
    : `<h1 class="hero-wordmark">${data.businessName}</h1>`;

  // Services as horizontal scrolling tags
  const svcTags = services.map(s => `<span class="svc-tag">${s.title}</span>`).join("");

  // Work rows — each service gets a full-bleed row
  const workRows = services.map((s, i) => {
    const rowImg = [img1, img2, img3, img4, img5][i] ?? null;
    return `
<div class="work-row" data-index="${String(i+1).padStart(2,"0")}">
  <div class="work-row-inner">
    <div class="work-row-meta">
      <span class="work-tag">${String(i+1).padStart(2,"0")}</span>
    </div>
    <div class="work-row-title">
      <h3>${s.title}</h3>
    </div>
    <div class="work-row-desc">
      <p>${s.desc}</p>
    </div>
    ${rowImg ? `<div class="work-row-img"><img src="${rowImg}" alt="${s.title}" loading="lazy" onerror="this.closest('.work-row-img').style.display='none'"></div>` : `<div class="work-row-line"></div>`}
  </div>
</div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.businessName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
<style>
/* ── RESET ──────────────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{font-size:16px;scroll-behavior:smooth}
body{
  background:#0a0a08;
  color:#e8e4dc;
  font-family:'Inter',system-ui,sans-serif;
  font-weight:300;
  overflow-x:hidden;
  cursor:none;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
button{background:none;border:none;cursor:none}

/* ── CURSOR ─────────────────────────────────────────────────────── */
.cur{position:fixed;pointer-events:none;z-index:9999;mix-blend-mode:difference}
.cur-dot{width:8px;height:8px;background:#fff;border-radius:50%;transform:translate(-50%,-50%);transition:width .2s,height .2s,opacity .2s}
.cur-ring{width:40px;height:40px;border:1px solid rgba(255,255,255,.4);border-radius:50%;transform:translate(-50%,-50%);transition:transform .12s cubic-bezier(.16,1,.3,1),width .25s,height .25s}
body:hover .cur-dot{opacity:1}
a:hover~.cur .cur-ring,a:hover .cur-ring{width:64px;height:64px}

/* ── NAV ────────────────────────────────────────────────────────── */
nav{
  position:fixed;top:0;left:0;right:0;z-index:500;
  display:flex;align-items:center;justify-content:space-between;
  padding:28px 48px;
  transition:padding .4s cubic-bezier(.16,1,.3,1);
}
nav.compact{padding:18px 48px;background:rgba(10,10,8,.92);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,.06)}
.nav-logo-img{height:32px;width:auto;object-fit:contain;filter:brightness(0) invert(1)}
.nav-logo-txt{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;letter-spacing:-.01em;color:#e8e4dc}
.nav-right{display:flex;align-items:center;gap:40px}
.nav-link{font-size:.78rem;font-weight:400;letter-spacing:.08em;text-transform:uppercase;color:rgba(232,228,220,.5);transition:color .2s}
.nav-link:hover{color:#e8e4dc}
.nav-contact{font-size:.78rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:${accent};border:1px solid ${accent}44;border-radius:100px;padding:9px 22px;transition:background .2s,color .2s}
.nav-contact:hover{background:${accent};color:#0a0a08}
@media(max-width:768px){nav{padding:20px 24px}nav.compact{padding:14px 24px}.nav-right{gap:20px}.nav-link{display:none}}

/* ── HERO ───────────────────────────────────────────────────────── */
.hero{
  min-height:100svh;
  display:grid;
  grid-template-rows:1fr auto;
  position:relative;
  overflow:hidden;
  padding:0 48px;
}
.hero-bg{
  position:absolute;inset:0;z-index:0;
  ${img0 ? `background:url(${img0}) center/cover no-repeat;` : `background:#0a0a08;`}
}
.hero-scrim{
  position:absolute;inset:0;z-index:1;
  background:linear-gradient(to bottom,rgba(10,10,8,.72) 0%,rgba(10,10,8,.55) 40%,rgba(10,10,8,.85) 85%,#0a0a08 100%);
}
.hero-content{
  position:relative;z-index:2;
  display:flex;flex-direction:column;
  justify-content:flex-end;
  padding-bottom:80px;
  padding-top:140px;
  gap:0;
}
.hero-eyebrow{
  font-family:'Syne',sans-serif;
  font-size:.7rem;font-weight:600;
  letter-spacing:.18em;text-transform:uppercase;
  color:${accent};
  margin-bottom:32px;
  display:flex;align-items:center;gap:12px;
  animation:fadeIn .8s ease both;
}
.hero-eyebrow::before{content:'';display:block;width:24px;height:1px;background:${accent}}
.hero-logo{
  height:100px;width:auto;max-width:480px;
  object-fit:contain;object-position:left;
  filter:brightness(0) invert(1);
  margin-bottom:40px;
  animation:slideUp .9s cubic-bezier(.16,1,.3,1) .05s both;
}
.hero-wordmark{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:clamp(3.5rem,9vw,9rem);
  font-weight:400;font-style:italic;
  line-height:.95;letter-spacing:-.03em;
  color:#e8e4dc;
  margin-bottom:40px;
  animation:slideUp .9s cubic-bezier(.16,1,.3,1) .05s both;
}
.hero-headline{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:clamp(2.8rem,6.5vw,7rem);
  font-weight:400;
  line-height:1.0;letter-spacing:-.03em;
  color:#e8e4dc;
  max-width:880px;
  animation:slideUp 1s cubic-bezier(.16,1,.3,1) .12s both;
}
.hero-headline em{font-style:italic;color:${accent}}
.hero-bottom{
  position:relative;z-index:2;
  display:flex;align-items:flex-end;justify-content:space-between;
  padding-bottom:48px;
  gap:32px;flex-wrap:wrap;
}
.hero-desc{
  font-size:clamp(.85rem,1.5vw,1rem);
  color:rgba(232,228,220,.55);
  line-height:1.75;
  max-width:380px;
  font-weight:300;
  animation:fadeIn 1s ease .3s both;
}
.hero-actions{display:flex;gap:16px;align-items:center;animation:fadeIn 1s ease .4s both;flex-wrap:wrap}
.btn-primary{
  display:inline-flex;align-items:center;gap:10px;
  padding:16px 32px;
  background:${accent};color:#0a0a08;
  border-radius:100px;
  font-family:'Syne',sans-serif;
  font-size:.82rem;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;
  transition:transform .2s,box-shadow .2s,opacity .15s;
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(${ar},${ag},${ab},.35);opacity:.92}
.btn-ghost{
  display:inline-flex;align-items:center;gap:10px;
  padding:16px 32px;
  border:1px solid rgba(232,228,220,.2);
  border-radius:100px;
  font-family:'Syne',sans-serif;
  font-size:.82rem;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;
  color:rgba(232,228,220,.7);
  transition:border-color .2s,color .2s;
}
.btn-ghost:hover{border-color:rgba(232,228,220,.5);color:#e8e4dc}
.hero-scroll-hint{
  display:flex;flex-direction:column;align-items:center;gap:8px;
  font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;
  color:rgba(232,228,220,.3);
  animation:bob 2.5s ease-in-out infinite;
}
.hero-scroll-hint::before{content:'';width:1px;height:40px;background:linear-gradient(rgba(232,228,220,.3),transparent)}

/* ── TICKER ─────────────────────────────────────────────────────── */
.ticker-wrap{overflow:hidden;border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07);padding:18px 0;background:#080807}
.ticker-track{display:flex;width:max-content;animation:marquee 30s linear infinite}
.ticker-item{
  display:inline-flex;align-items:center;gap:10px;
  padding:0 36px;
  font-family:'Syne',sans-serif;
  font-size:.68rem;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;
  color:rgba(232,228,220,.25);
  white-space:nowrap;
}
.ticker-item .dot{color:${accent};opacity:.7}

/* ── STATEMENT SECTION ──────────────────────────────────────────── */
.statement{
  padding:160px 48px;
  max-width:1400px;margin:0 auto;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.statement-inner{
  display:grid;
  grid-template-columns:200px 1fr;
  gap:80px;
  align-items:start;
}
.statement-label{
  font-family:'Syne',sans-serif;
  font-size:.68rem;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;
  color:rgba(232,228,220,.35);
  padding-top:8px;
}
.statement-text{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:clamp(1.8rem,3.5vw,3rem);
  font-weight:400;
  line-height:1.35;
  letter-spacing:-.02em;
  color:#e8e4dc;
}
.statement-text em{font-style:italic;color:${accent}}
@media(max-width:768px){.statement{padding:100px 24px}.statement-inner{grid-template-columns:1fr;gap:24px}}

/* ── SERVICES / WORK ROWS ───────────────────────────────────────── */
.work-section{border-bottom:1px solid rgba(255,255,255,.06)}
.work-section-header{
  padding:80px 48px 40px;
  display:flex;align-items:baseline;justify-content:space-between;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.work-section-title{
  font-family:'Syne',sans-serif;
  font-size:.68rem;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;
  color:rgba(232,228,220,.35);
}
.work-section-count{
  font-family:'Syne',sans-serif;
  font-size:.68rem;
  color:rgba(232,228,220,.2);
  letter-spacing:.1em;
}
.work-row{
  border-bottom:1px solid rgba(255,255,255,.06);
  overflow:hidden;
  position:relative;
}
.work-row-inner{
  display:grid;
  grid-template-columns:80px 1fr 1fr 220px;
  align-items:center;
  gap:0;
  padding:36px 48px;
  transition:background .3s;
  position:relative;
}
.work-row:hover .work-row-inner{background:rgba(255,255,255,.025)}
.work-tag{
  font-family:'Syne',sans-serif;
  font-size:.65rem;font-weight:700;
  letter-spacing:.1em;
  color:rgba(232,228,220,.2);
  transition:color .3s;
}
.work-row:hover .work-tag{color:${accent}}
.work-row-title h3{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:clamp(1.4rem,2.5vw,2.2rem);
  font-weight:400;
  letter-spacing:-.02em;
  color:#e8e4dc;
  transition:color .3s;
  line-height:1.1;
}
.work-row:hover .work-row-title h3{color:${accent}}
.work-row-desc p{
  font-size:.88rem;
  color:rgba(232,228,220,.45);
  line-height:1.7;
  font-weight:300;
  max-width:320px;
  padding-right:40px;
}
.work-row-img{
  width:220px;height:120px;
  border-radius:8px;overflow:hidden;
  opacity:0;transform:scale(.96);
  transition:opacity .4s cubic-bezier(.16,1,.3,1),transform .4s cubic-bezier(.16,1,.3,1);
}
.work-row:hover .work-row-img{opacity:1;transform:scale(1)}
.work-row-img img{width:100%;height:100%;object-fit:cover}
.work-row-line{width:220px;height:1px;background:rgba(255,255,255,.06);justify-self:end}
@media(max-width:900px){
  .work-row-inner{grid-template-columns:48px 1fr;padding:28px 24px}
  .work-row-desc,.work-row-img,.work-row-line{display:none}
  .work-section-header{padding:60px 24px 32px}
}

/* ── FULL BLEED IMAGE ───────────────────────────────────────────── */
.full-img{
  width:100%;
  height:70vh;
  overflow:hidden;
  position:relative;
}
.full-img img{
  width:100%;height:100%;
  object-fit:cover;
  filter:brightness(.7) saturate(.85);
  transform:scale(1.05);
  transition:transform 8s ease;
}
.full-img.in-view img{transform:scale(1)}
.full-img-caption{
  position:absolute;bottom:32px;right:48px;
  font-family:'Syne',sans-serif;
  font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;
  color:rgba(255,255,255,.4);
}

/* ── ABOUT / SPLIT ──────────────────────────────────────────────── */
.split{
  display:grid;
  grid-template-columns:1fr 1fr;
  min-height:600px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.split-img{overflow:hidden;position:relative}
.split-img img{width:100%;height:100%;object-fit:cover;filter:brightness(.75) saturate(.8)}
.split-body{
  padding:100px 80px;
  display:flex;flex-direction:column;justify-content:center;
  gap:32px;
  border-left:1px solid rgba(255,255,255,.06);
}
.split-label{
  font-family:'Syne',sans-serif;
  font-size:.65rem;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;
  color:${accent};
}
.split-headline{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:clamp(2rem,4vw,3.4rem);
  font-weight:400;
  line-height:1.15;
  letter-spacing:-.025em;
  color:#e8e4dc;
}
.split-headline em{font-style:italic;color:${accent}}
.split-copy{
  font-size:.95rem;
  color:rgba(232,228,220,.5);
  line-height:1.85;
  font-weight:300;
}
.split-stats{
  display:flex;flex-direction:column;gap:0;
  border-top:1px solid rgba(255,255,255,.07);
  margin-top:8px;
}
.stat-row{
  display:flex;align-items:baseline;gap:20px;
  padding:20px 0;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.stat-val{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:2.2rem;font-weight:400;font-style:italic;
  color:${accent};line-height:1;white-space:nowrap;
}
.stat-lbl{font-size:.82rem;color:rgba(232,228,220,.4);line-height:1.5;font-weight:300}
@media(max-width:900px){.split{grid-template-columns:1fr}.split-img{height:320px}.split-body{padding:64px 24px;border-left:none;border-top:1px solid rgba(255,255,255,.06)}}

/* ── CTA SECTION ────────────────────────────────────────────────── */
.cta-section{
  padding:180px 48px;
  text-align:center;
  position:relative;overflow:hidden;
}
.cta-glow{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:600px;height:600px;
  background:radial-gradient(circle,rgba(${ar},${ag},${ab},.08) 0%,transparent 65%);
  pointer-events:none;
}
.cta-eyebrow{
  font-family:'Syne',sans-serif;
  font-size:.68rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:rgba(232,228,220,.35);margin-bottom:40px;
}
.cta-headline{
  font-family:'Instrument Serif',Georgia,serif;
  font-size:clamp(2.8rem,7vw,7rem);
  font-weight:400;font-style:italic;
  line-height:1.0;letter-spacing:-.03em;
  color:#e8e4dc;
  margin-bottom:56px;
}
.cta-headline em{font-style:normal;color:${accent}}
.cta-actions{display:flex;justify-content:center;gap:16px;flex-wrap:wrap}
@media(max-width:640px){.cta-section{padding:120px 24px}}

/* ── FOOTER ─────────────────────────────────────────────────────── */
.footer{
  padding:48px;
  border-top:1px solid rgba(255,255,255,.07);
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  gap:24px;
}
.footer-name{
  font-family:'Syne',sans-serif;
  font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:rgba(232,228,220,.4);
}
.footer-center{
  font-family:'Syne',sans-serif;
  font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;
  color:rgba(232,228,220,.2);text-align:center;
}
.footer-credit{
  font-size:.72rem;color:rgba(232,228,220,.25);
  text-align:right;font-weight:300;
}
.footer-credit a{color:${accent};transition:opacity .15s}
.footer-credit a:hover{opacity:.7}
@media(max-width:640px){.footer{padding:32px 24px;grid-template-columns:1fr}.footer-center,.footer-credit{text-align:left}}

/* ── STICKY BAR ─────────────────────────────────────────────────── */
.sticky-bar{
  position:fixed;bottom:0;left:0;right:0;z-index:400;
  padding:14px 40px;
  display:flex;align-items:center;justify-content:space-between;
  background:rgba(10,10,8,.97);
  border-top:1px solid rgba(255,255,255,.07);
  backdrop-filter:blur(20px);
  transform:translateY(110%);
  transition:transform .5s cubic-bezier(.16,1,.3,1);
}
.sticky-bar.show{transform:translateY(0)}
.sticky-bar-text{font-size:.82rem;color:rgba(232,228,220,.4);font-weight:300}
.sticky-bar-text strong{color:#e8e4dc;font-weight:500}
.sticky-bar-cta{
  font-family:'Syne',sans-serif;
  font-size:.75rem;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;
  color:#0a0a08;background:${accent};
  padding:10px 24px;border-radius:100px;
  white-space:nowrap;transition:opacity .15s;
}
.sticky-bar-cta:hover{opacity:.85}
@media(max-width:640px){.sticky-bar{padding:12px 20px}.sticky-bar-text{display:none}}

/* ── AI BADGE ───────────────────────────────────────────────────── */
.ai-tag{
  position:fixed;top:80px;right:24px;z-index:490;
  padding:5px 12px;
  border:1px solid rgba(255,255,255,.1);
  border-radius:100px;
  font-size:.65rem;font-weight:500;letter-spacing:.06em;
  color:rgba(232,228,220,.3);
  background:rgba(10,10,8,.8);
}

/* ── ANIMATIONS ─────────────────────────────────────────────────── */
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
</style>
</head>
<body>

<!-- Custom cursor -->
<div class="cur" id="cur"><div class="cur-dot"></div></div>
<div class="cur" id="cur-ring" style="position:fixed;pointer-events:none;z-index:9998"><div class="cur-ring"></div></div>

<!-- AI Tag -->
<div class="ai-tag">${source === "claude" ? "⚡ AI Copy" : "📋 Template"}</div>

<!-- Nav -->
<nav id="nav">
  <a href="#top">${navLogo}</a>
  <div class="nav-right">
    <a href="#services" class="nav-link">Services</a>
    <a href="#about" class="nav-link">About</a>
    <a href="${contactHref}" class="nav-contact">${copy.cta}</a>
  </div>
</nav>

<!-- Hero -->
<section class="hero" id="top">
  <div class="hero-bg"></div>
  <div class="hero-scrim"></div>
  <div class="hero-content">
    <div class="hero-eyebrow">${domain} — Est. ${year}</div>
    ${heroLogo}
    <h2 class="hero-headline">${copy.headline.replace(/(\S+)\s*$/, '<em>$1</em>')}</h2>
  </div>
  <div class="hero-bottom">
    <p class="hero-desc">${copy.subhead}</p>
    <div class="hero-actions">
      <a href="${contactHref}" class="btn-primary">${copy.cta} ↗</a>
      <a href="#services" class="btn-ghost">See Services</a>
    </div>
    ${data.phone ? `<div class="hero-scroll-hint">${data.phone}</div>` : `<div class="hero-scroll-hint">scroll</div>`}
  </div>
</section>

<!-- Ticker -->
<div class="ticker-wrap">
  <div class="ticker-track" id="ticker">
    ${[...services.map(s=>s.title), data.businessName, copy.cta, domain.toUpperCase(), ...services.map(s=>s.title), data.businessName, copy.cta, domain.toUpperCase()].map(t=>`<span class="ticker-item">${t} <span class="dot">✦</span></span>`).join("")}
  </div>
</div>

<!-- Statement -->
<div class="statement" id="about">
  <div class="statement-inner">
    <span class="statement-label">About</span>
    <p class="statement-text">${data.description ? data.description.slice(0,220) : `${data.businessName} delivers work that holds up — built with precision, backed by experience, trusted by the people who depend on it most.`}<em> ${copy.closingHeadline}</em></p>
  </div>
</div>

<!-- Services -->
<div class="work-section" id="services">
  <div class="work-section-header">
    <span class="work-section-title">Services</span>
    <span class="work-section-count">(${String(services.length).padStart(2,"0")})</span>
  </div>
  ${workRows}
</div>

<!-- Full bleed image -->
${img0 ? `<div class="full-img" id="full-img-1"><img src="${img0}" alt="${data.businessName}" loading="lazy"><span class="full-img-caption">${data.businessName} — ${domain}</span></div>` : ""}

<!-- Split: image + about stats -->
<div class="split">
  <div class="split-img">
    ${img2 ? `<img src="${img2}" alt="${data.businessName}" loading="lazy">` : `<div style="background:#111110;width:100%;height:100%;min-height:400px"></div>`}
  </div>
  <div class="split-body">
    <span class="split-label">Why us</span>
    <h2 class="split-headline">Built to last.<br><em>Backed by results.</em></h2>
    <p class="split-copy">${data.description ? data.description.slice(0,180) : `Every job we take on gets our full attention. We show up, we deliver, and we stand behind the work — no excuses.`}</p>
    <div class="split-stats">
      <div class="stat-row"><span class="stat-val">100%</span><span class="stat-lbl">Satisfaction — we don't consider the job done until you do.</span></div>
      <div class="stat-row"><span class="stat-val">${data.phone ? data.phone : "Fast"}</span><span class="stat-lbl">${data.phone ? "Call us directly — real people, real answers." : "Quick response time. No runaround."}</span></div>
      <div class="stat-row"><span class="stat-val">Local</span><span class="stat-lbl">Serving the community. Every project, every time.</span></div>
    </div>
  </div>
</div>

<!-- CTA -->
<section class="cta-section" id="contact">
  <div class="cta-glow"></div>
  <p class="cta-eyebrow">Let's work together</p>
  <h2 class="cta-headline">${copy.closingHeadline.replace(/(\S+)\s*$/, '<em>$1</em>')}</h2>
  <div class="cta-actions">
    <a href="${contactHref}" class="btn-primary">${copy.cta} ↗</a>
    <a href="${data.url}" target="_blank" rel="noopener" class="btn-ghost">View Current Site</a>
  </div>
</section>

<!-- Footer -->
<footer class="footer">
  <span class="footer-name">${data.businessName}</span>
  <span class="footer-center">${domain} — ${year}</span>
  <span class="footer-credit">Redesign preview by <a href="https://randybuilds.ca" target="_blank">RandyBuilds</a></span>
</footer>

<!-- Sticky bar -->
<div class="sticky-bar" id="sbar">
  <span class="sticky-bar-text"><strong>Free preview.</strong> This could be your site in 2 weeks.</span>
  <a href="https://randybuilds.ca" target="_blank" class="sticky-bar-cta">Get This Site →</a>
</div>

<script>
// Cursor
const dot = document.querySelector('.cur-dot');
const ring = document.querySelector('#cur-ring .cur-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.left=mx+'px';dot.style.top=my+'px'});
(function loop(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=Math.round(rx)+'px';ring.style.top=Math.round(ry)+'px';requestAnimationFrame(loop)})();

// Nav compact
const nav=document.getElementById('nav');
window.addEventListener('scroll',()=>nav.classList.toggle('compact',scrollY>60),{passive:true});

// Sticky bar
const sbar=document.getElementById('sbar');
window.addEventListener('scroll',()=>sbar.classList.toggle('show',scrollY>window.innerHeight*.7),{passive:true});

// Full-bleed image parallax on scroll
const fi=document.getElementById('full-img-1');
if(fi){const io=new IntersectionObserver(e=>{if(e[0].isIntersecting)fi.classList.add('in-view')},{threshold:.1});io.observe(fi)}

// Reveal on scroll
const rev=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.style.opacity='1';
      e.target.style.transform='none';
    }
  });
},{threshold:.06,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.statement-inner,.work-row,.split-body,.split-img,.cta-headline,.cta-eyebrow').forEach(el=>{
  el.style.opacity='0';el.style.transform='translateY(24px)';
  el.style.transition='opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1)';
  rev.observe(el);
});

// Ticker duplicate for infinite scroll
const t=document.getElementById('ticker');
if(t){t.parentElement.appendChild(t.cloneNode(true))}
</script>
</body>
</html>`;
}

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
    if (!data.businessName && data.description) {
      data.businessName = data.description.split(/\s+/).slice(0, 4).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    if (!data.url || data.url === "https://example.com") {
      data.url = "https://example.com";
    }
    if (!data.businessName) {
      data.businessName = "Your Business";
    }

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
