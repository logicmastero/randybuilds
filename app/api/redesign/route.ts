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
Meta description: ${data.description || "Not provided"}
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
  // ── Normalize images ────────────────────────────────────────────────────────
  const images = (data as ScrapedInput & { images?: string[] }).images ?? [];
  const heroBgImg   = images[0] ?? null;
  const serviceImages = images.slice(1, 4);
  const extraImages   = images.slice(4, 10);

  // ── Color system ────────────────────────────────────────────────────────────
  const rawPrimary = data.colors[0] || "#1a1a1a";
  const rawSecondary = data.colors[1] || rawPrimary;

  // Parse primary
  const hp = rawPrimary.replace("#","");
  const pr = parseInt(hp.slice(0,2),16), pg = parseInt(hp.slice(2,4),16), pb = parseInt(hp.slice(4,6),16);
  const lum = (0.299*pr + 0.587*pg + 0.114*pb)/255;

  // Always render on a near-black canvas for maximum premium feel
  // Use brand color only as accent, never as background
  const accent  = rawPrimary;
  const accent2 = rawSecondary;

  const bg      = "#0c0c0e";
  const bgCard  = "#131316";
  const bgMuted = "#18181c";
  const border  = "#242428";
  const borderAccent = `rgba(${pr},${pg},${pb},0.25)`;
  const textMain = "#f0f0f2";
  const textMid  = "#8c8c96";
  const textDim  = "#52525a";
  const shadowAccent = `rgba(${pr},${pg},${pb},0.20)`;
  const glowAccent   = `rgba(${pr},${pg},${pb},0.12)`;

  // Secondary color parsing
  const hs = rawSecondary.replace("#","");
  const sr = parseInt(hs.slice(0,2),16), sg = parseInt(hs.slice(2,4),16), sb = parseInt(hs.slice(4,6),16);

  // ── Logo ────────────────────────────────────────────────────────────────────
  const navLogoHTML = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="nav-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="nav-logo-text" style="display:none">${data.businessName}</span>`
    : `<span class="nav-logo-text">${data.businessName}</span>`;

  const heroLogoHTML = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="hero-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="hero-logo-wordmark" style="display:none">${data.businessName}</div>`
    : `<div class="hero-logo-wordmark">${data.businessName}</div>`;

  // ── Services ────────────────────────────────────────────────────────────────
  const servicesHTML = copy.services.map((s, i) => `
    <div class="svc-card" style="--delay:${i * 60}ms">
      <div class="svc-num">0${i+1}</div>
      <div class="svc-content">
        <h3 class="svc-title">${s.title}</h3>
        <p class="svc-desc">${s.desc}</p>
      </div>
      <div class="svc-arrow">↗</div>
    </div>`).join("");

  // ── Contact ──────────────────────────────────────────────────────────────────
  const domain = (() => { try { return new URL(data.url).hostname.replace("www.",""); } catch { return data.url; } })();
  const phoneHref = data.phone ? `tel:${data.phone.replace(/\D/g,"")}` : "#contact";
  const emailHref = data.email ? `mailto:${data.email}` : "#contact";

  // ── Feature strip (3 images, full width, cinematic) ──────────────────────
  const featureStripHTML = serviceImages.length > 0
    ? `<section class="img-strip">
        ${serviceImages.map(img => `<div class="strip-cell"><img src="${img}" alt="${data.businessName}" loading="lazy" onerror="this.closest('.strip-cell').style.display='none'"></div>`).join("")}
      </section>`
    : "";

  // ── Mosaic work section ───────────────────────────────────────────────────
  const mosaicHTML = extraImages.length >= 2
    ? `<section class="mosaic-section">
        <div class="mosaic-inner">
          <div class="mosaic-copy">
            <p class="overline">Our Work</p>
            <h2 class="mosaic-headline">Built for the <em>field</em></h2>
            <p class="mosaic-body">${data.description ? data.description.slice(0,160).replace(/[.!?].*$/s, "") + "." : `${data.businessName} shows up ready — every unit maintained, every job covered.`}</p>
            <a href="#contact" class="cta-pill">${copy.cta} <span>→</span></a>
          </div>
          <div class="mosaic-grid">
            ${extraImages.slice(0,4).map((img, i) => `
              <div class="mosaic-cell mc-${i}">
                <img src="${img}" alt="" loading="lazy" onerror="this.closest('.mosaic-cell').style.display='none'">
              </div>`).join("")}
          </div>
        </div>
      </section>`
    : "";

  // ── AI badge ──────────────────────────────────────────────────────────────
  const aiBadge = source === "claude"
    ? `<div class="ai-pill">⚡ AI-Generated Copy</div>`
    : `<div class="ai-pill ai-fallback">📋 Template Preview</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.businessName} — Redesign by RandyBuilds</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
<style>
/* ─── Reset ──────────────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;font-size:16px}
body{font-family:'DM Sans',system-ui,sans-serif;background:${bg};color:${textMain};overflow-x:hidden;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img{max-width:100%;display:block}
a{text-decoration:none;color:inherit}

/* ─── Reveal ─────────────────────────────────────────────────────── */
.reveal{opacity:0;transform:translateY(32px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}
.reveal-left{opacity:0;transform:translateX(-32px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)}
.reveal-left.in{opacity:1;transform:none}
.reveal-right{opacity:0;transform:translateX(32px);transition:opacity .75s cubic-bezier(.16,1,.3,1),transform .75s cubic-bezier(.16,1,.3,1)}
.reveal-right.in{opacity:1;transform:none}

/* ─── NAV ─────────────────────────────────────────────────────────── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;transition:background .3s,border-color .3s,backdrop-filter .3s}
.nav.solid{background:rgba(12,12,14,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid ${border}}
.nav-logo{height:36px;width:auto;object-fit:contain}
.nav-logo-text{font-size:1.2rem;font-weight:700;letter-spacing:-.02em;color:${textMain}}
.nav-links{display:flex;gap:36px}
.nav-links a{font-size:.875rem;font-weight:500;color:${textMid};transition:color .15s}
.nav-links a:hover{color:${textMain}}
.nav-cta{padding:10px 22px;background:${accent};color:#fff;border-radius:8px;font-size:.875rem;font-weight:600;transition:opacity .15s,transform .15s}
.nav-cta:hover{opacity:.88;transform:translateY(-1px)}
@media(max-width:768px){.nav{padding:0 24px}.nav-links{display:none}}

/* ─── HERO ────────────────────────────────────────────────────────── */
.hero{min-height:100svh;display:grid;place-items:center;position:relative;overflow:hidden;padding:120px 56px 100px}
.hero-bg{position:absolute;inset:0;background:${bg}}
${heroBgImg ? `
.hero-photo{position:absolute;inset:0;background:url(${heroBgImg}) center/cover no-repeat;opacity:.15}
.hero-photo-grad{position:absolute;inset:0;background:radial-gradient(ellipse 120% 100% at 50% 100%,${bg} 0%,transparent 60%),linear-gradient(180deg,${bg} 0%,transparent 20%,transparent 80%,${bg} 100%)}
` : ""}
.hero-noise{position:absolute;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");opacity:.4;pointer-events:none}
.hero-glow{position:absolute;width:900px;height:900px;top:50%;left:50%;transform:translate(-50%,-60%);background:radial-gradient(circle,${glowAccent} 0%,transparent 65%);pointer-events:none}
.hero-content{position:relative;z-index:2;text-align:center;max-width:860px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:0}
.hero-logo{height:72px;width:auto;max-width:280px;object-fit:contain;margin-bottom:40px;filter:drop-shadow(0 0 24px ${accent}55);animation:fadeUp .7s cubic-bezier(.16,1,.3,1) both}
.hero-logo-wordmark{font-family:'DM Serif Display',Georgia,serif;font-size:2rem;font-weight:400;color:${accent};margin-bottom:40px;letter-spacing:-.02em;animation:fadeUp .7s cubic-bezier(.16,1,.3,1) both}
.hero-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:${accent};margin-bottom:28px;animation:fadeUp .7s cubic-bezier(.16,1,.3,1) .05s both}
.hero-eyebrow::before,.hero-eyebrow::after{content:'';display:block;height:1px;width:28px;background:${accent};opacity:.5}
.hero-headline{font-family:'DM Serif Display',Georgia,serif;font-size:clamp(3.2rem,7.5vw,7.2rem);font-weight:400;font-style:italic;line-height:1.0;letter-spacing:-.03em;color:${textMain};margin-bottom:28px;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .1s both}
.hero-headline em{font-style:normal;color:${accent}}
.hero-sub{font-size:clamp(1rem,2vw,1.2rem);font-weight:300;color:${textMid};line-height:1.8;max-width:560px;margin-bottom:52px;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .18s both}
.hero-actions{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .26s both}
.btn-fill{display:inline-flex;align-items:center;gap:10px;padding:15px 34px;background:${accent};color:#fff;border-radius:100px;font-size:.95rem;font-weight:600;letter-spacing:-.01em;transition:transform .18s,box-shadow .18s,opacity .15s;box-shadow:0 8px 32px ${shadowAccent}}
.btn-fill:hover{transform:translateY(-2px);box-shadow:0 16px 48px ${shadowAccent};opacity:.93}
.btn-outline{display:inline-flex;align-items:center;gap:10px;padding:15px 34px;border:1.5px solid ${border};color:${textMid};border-radius:100px;font-size:.95rem;font-weight:500;letter-spacing:-.01em;transition:border-color .15s,color .15s,transform .15s}
.btn-outline:hover{border-color:${accent}88;color:${textMain};transform:translateY(-2px)}
${data.phone ? `.hero-phone{margin-top:28px;font-size:.875rem;color:${textDim};animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .34s both}.hero-phone a{color:${accent};font-weight:600;transition:opacity .15s}.hero-phone a:hover{opacity:.75}` : ""}
.hero-scroll{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;opacity:.35;animation:bob 2s ease-in-out infinite}
.hero-scroll span{font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;color:${textMid}}
.hero-scroll-line{width:1px;height:36px;background:linear-gradient(${textDim},transparent)}
@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(5px)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}

/* ─── MARQUEE / TICKER ───────────────────────────────────────────── */
.ticker{border-top:1px solid ${border};border-bottom:1px solid ${border};overflow:hidden;padding:20px 0;background:${bgMuted}}
.ticker-track{display:flex;gap:0;animation:ticker 25s linear infinite;width:max-content}
.ticker-item{display:flex;align-items:center;gap:12px;padding:0 48px;font-size:.8rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${textDim};white-space:nowrap}
.ticker-item::after{content:'✦';color:${accent};opacity:.6;margin-left:12px}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* ─── SERVICES ───────────────────────────────────────────────────── */
.services{padding:130px 56px;max-width:1200px;margin:0 auto}
.section-header{margin-bottom:72px}
.overline{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${accent};margin-bottom:16px;display:block}
.section-h{font-family:'DM Serif Display',Georgia,serif;font-size:clamp(2.2rem,4.5vw,3.8rem);font-weight:400;letter-spacing:-.025em;line-height:1.1;color:${textMain}}
.section-h em{font-style:italic;color:${textMid}}
.svc-list{display:flex;flex-direction:column;gap:0;border-top:1px solid ${border}}
.svc-card{display:grid;grid-template-columns:80px 1fr 40px;align-items:center;gap:32px;padding:32px 0;border-bottom:1px solid ${border};cursor:default;transition:background .2s;opacity:0;transform:translateY(16px);transition:opacity .55s cubic-bezier(.16,1,.3,1) var(--delay),transform .55s cubic-bezier(.16,1,.3,1) var(--delay),background .2s}
.svc-card.in{opacity:1;transform:none}
.svc-card:hover{background:${bgCard};border-radius:12px;padding-left:20px;padding-right:20px;margin:0 -20px}
.svc-num{font-size:.75rem;font-weight:700;color:${textDim};letter-spacing:.1em}
.svc-content{}
.svc-title{font-size:1.1rem;font-weight:600;color:${textMain};margin-bottom:6px;letter-spacing:-.01em}
.svc-desc{font-size:.9rem;color:${textMid};line-height:1.65;font-weight:300}
.svc-arrow{font-size:1.1rem;color:${textDim};transition:color .15s,transform .15s;justify-self:end}
.svc-card:hover .svc-arrow{color:${accent};transform:translate(3px,-3px)}
@media(max-width:640px){.svc-card{grid-template-columns:48px 1fr}.svc-arrow{display:none}.services{padding:80px 24px}}

/* ─── IMAGE STRIP ────────────────────────────────────────────────── */
.img-strip{display:flex;height:360px;overflow:hidden;border-top:1px solid ${border};border-bottom:1px solid ${border}}
.strip-cell{flex:1;overflow:hidden;position:relative}
.strip-cell img{width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.16,1,.3,1),filter .4s;filter:brightness(.85) saturate(.9)}
.strip-cell:hover img{transform:scale(1.06);filter:brightness(1) saturate(1.1)}
.strip-cell+.strip-cell{border-left:1px solid ${border}}
@media(max-width:640px){.img-strip{height:220px}.strip-cell:nth-child(3){display:none}}

/* ─── ABOUT SECTION ──────────────────────────────────────────────── */
.about{padding:130px 56px;max-width:1200px;margin:0 auto}
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:100px;align-items:start}
.about-headline{font-family:'DM Serif Display',Georgia,serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:400;letter-spacing:-.025em;line-height:1.15;color:${textMain};margin-bottom:28px}
.about-headline em{font-style:italic;color:${accent}}
.about-body{font-size:1rem;color:${textMid};line-height:1.85;font-weight:300;margin-bottom:36px}
.about-stats{display:flex;flex-direction:column;gap:0;border-top:1px solid ${border}}
.about-stat{padding:24px 0;border-bottom:1px solid ${border};display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center}
.about-stat-val{font-family:'DM Serif Display',Georgia,serif;font-size:2rem;font-weight:400;color:${accent};line-height:1}
.about-stat-label{font-size:.85rem;color:${textMid};line-height:1.5;font-weight:300}
@media(max-width:768px){.about-grid{grid-template-columns:1fr;gap:56px}.about{padding:80px 24px}}

/* ─── MOSAIC / WORK SECTION ──────────────────────────────────────── */
.mosaic-section{padding:0 56px 130px;max-width:1200px;margin:0 auto}
.mosaic-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.mosaic-copy .overline{margin-bottom:14px}
.mosaic-headline{font-family:'DM Serif Display',Georgia,serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:400;letter-spacing:-.025em;line-height:1.1;color:${textMain};margin-bottom:20px}
.mosaic-headline em{font-style:italic;color:${accent}}
.mosaic-body{font-size:1rem;color:${textMid};line-height:1.8;font-weight:300;margin-bottom:36px}
.cta-pill{display:inline-flex;align-items:center;gap:10px;padding:14px 30px;border:1.5px solid ${border};color:${textMid};border-radius:100px;font-size:.9rem;font-weight:500;transition:border-color .15s,color .15s,transform .15s}
.cta-pill:hover{border-color:${accent};color:${accent};transform:translateY(-2px)}
.mosaic-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:200px 200px;gap:10px}
.mc-0{border-radius:16px;overflow:hidden;grid-row:span 2;background:${bgCard};border:1px solid ${border}}
.mc-1,.mc-2,.mc-3{border-radius:16px;overflow:hidden;background:${bgCard};border:1px solid ${border}}
.mosaic-grid [class^="mc-"] img{width:100%;height:100%;object-fit:cover;transition:transform .6s cubic-bezier(.16,1,.3,1);filter:brightness(.9)}
.mosaic-grid [class^="mc-"]:hover img{transform:scale(1.05);filter:brightness(1)}
@media(max-width:900px){.mosaic-inner{grid-template-columns:1fr}.mosaic-grid{grid-template-rows:160px;grid-template-columns:repeat(3,1fr)}.mc-0{grid-row:span 1}.mosaic-section{padding:0 24px 80px}}

/* ─── CTA BANNER ─────────────────────────────────────────────────── */
.cta-banner{margin:0 56px 56px;border:1px solid ${borderAccent};border-radius:24px;padding:80px 72px;background:linear-gradient(135deg,${bgCard} 0%,${bg} 100%);position:relative;overflow:hidden}
.cta-banner::before{content:'';position:absolute;top:-120px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,${glowAccent} 0%,transparent 65%);pointer-events:none}
.cta-banner-inner{position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:48px;align-items:center}
.cta-banner-h{font-family:'DM Serif Display',Georgia,serif;font-size:clamp(1.8rem,3.5vw,3rem);font-weight:400;letter-spacing:-.025em;line-height:1.1;color:${textMain}}
.cta-banner-sub{font-size:.95rem;color:${textMid};margin-top:12px;line-height:1.6;font-weight:300}
.cta-banner-actions{display:flex;flex-direction:column;gap:12px;align-items:flex-end;flex-shrink:0}
@media(max-width:768px){.cta-banner{margin:0 24px 40px;padding:52px 32px}.cta-banner-inner{grid-template-columns:1fr}.cta-banner-actions{align-items:flex-start}}

/* ─── FOOTER ─────────────────────────────────────────────────────── */
.footer{padding:48px 56px;border-top:1px solid ${border};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px}
.footer-left{}
.footer-name{font-size:.95rem;font-weight:600;color:${textMain};letter-spacing:-.01em}
.footer-domain{font-size:.8rem;color:${textDim};margin-top:4px}
.footer-credit{font-size:.78rem;color:${textDim}}
.footer-credit a{color:${accent};transition:opacity .15s}
.footer-credit a:hover{opacity:.7}
@media(max-width:640px){.footer{padding:36px 24px;flex-direction:column;gap:16px}}

/* ─── STICKY BOTTOM BAR ──────────────────────────────────────────── */
.bottom-bar{position:fixed;bottom:0;left:0;right:0;z-index:99;display:flex;align-items:center;justify-content:space-between;padding:16px 40px;background:rgba(12,12,14,0.96);border-top:1px solid ${border};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);transform:translateY(100%);transition:transform .5s cubic-bezier(.16,1,.3,1)}
.bottom-bar.visible{transform:translateY(0)}
.bottom-bar-text{font-size:.85rem;color:${textMid};font-weight:300}
.bottom-bar-text strong{color:${textMain};font-weight:600}
.bottom-bar-cta{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;background:${accent};color:#fff;border-radius:100px;font-size:.85rem;font-weight:600;white-space:nowrap;transition:opacity .15s}
.bottom-bar-cta:hover{opacity:.88}
@media(max-width:640px){.bottom-bar{padding:14px 20px}.bottom-bar-text{display:none}}

/* ─── AI BADGE ───────────────────────────────────────────────────── */
.ai-pill{position:fixed;top:84px;right:24px;z-index:99;padding:6px 14px;background:${bgCard};border:1px solid ${border};border-radius:100px;font-size:.7rem;font-weight:600;color:${textDim};letter-spacing:.04em}
.ai-fallback{border-color:${border};color:${textDim}}
</style>
</head>
<body>

<!-- Nav -->
<nav class="nav" id="nav">
  <a href="#" class="nav-brand">${navLogoHTML}</a>
  <div class="nav-links">
    <a href="#services">Services</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
  </div>
  <a href="#contact" class="nav-cta">${copy.cta}</a>
</nav>

${aiBadge}

<!-- Hero -->
<section class="hero" id="top">
  <div class="hero-bg"></div>
  ${heroBgImg ? '<div class="hero-photo"></div><div class="hero-photo-grad"></div>' : ""}
  <div class="hero-noise"></div>
  <div class="hero-glow"></div>
  <div class="hero-content">
    ${heroLogoHTML}
    <span class="hero-eyebrow">${domain}</span>
    <h1 class="hero-headline">${copy.headline.includes(" ") ? copy.headline.replace(/(\w+)\s*$/, "<em>$1</em>") : copy.headline}</h1>
    <p class="hero-sub">${copy.subhead}</p>
    <div class="hero-actions">
      <a href="${data.phone ? phoneHref : data.email ? emailHref : "#contact"}" class="btn-fill">${copy.cta} →</a>
      <a href="#services" class="btn-outline">See Our Services</a>
    </div>
    ${data.phone ? `<p class="hero-phone">Call us directly: <a href="${phoneHref}">${data.phone}</a></p>` : ""}
  </div>
  <div class="hero-scroll"><span>scroll</span><div class="hero-scroll-line"></div></div>
</section>

<!-- Ticker -->
<div class="ticker">
  <div class="ticker-track" id="ticker">
    ${[...copy.services.map(s => s.title), data.businessName, copy.cta, domain, ...copy.services.map(s => s.title), data.businessName, copy.cta, domain].map(t => `<div class="ticker-item">${t}</div>`).join("")}
  </div>
</div>

<!-- Services -->
<section class="services" id="services">
  <div class="section-header reveal">
    <span class="overline">What We Do</span>
    <h2 class="section-h">Services that <em>deliver</em></h2>
  </div>
  <div class="svc-list">
    ${servicesHTML}
  </div>
</section>

<!-- Image Strip -->
${featureStripHTML}

<!-- About -->
<section class="about" id="about">
  <div class="about-grid">
    <div class="reveal-left">
      <h2 class="about-headline">Built on craft.<br><em>Backed by results.</em></h2>
      <p class="about-body">${data.description || `${data.businessName} has built a reputation on delivering quality work — the kind that holds up and keeps clients coming back.`}</p>
      <a href="#contact" class="btn-fill">${copy.cta} →</a>
    </div>
    <div class="about-stats reveal-right">
      <div class="about-stat"><span class="about-stat-val">100%</span><span class="about-stat-label">Client satisfaction — we don't close a job until it's right.</span></div>
      <div class="about-stat"><span class="about-stat-val">Fast</span><span class="about-stat-label">Responsive, on-time, no runaround. We show up when you need us.</span></div>
      <div class="about-stat"><span class="about-stat-val">${data.phone ? data.phone : "Local"}</span><span class="about-stat-label">${data.phone ? "Real people. Call us directly — no answering machines." : "Proudly serving the local community."}</span></div>
    </div>
  </div>
</section>

<!-- Mosaic -->
${mosaicHTML}

<!-- CTA Banner -->
<div class="cta-banner reveal" id="contact">
  <div class="cta-banner-inner">
    <div>
      <h2 class="cta-banner-h">${copy.closingHeadline}</h2>
      <p class="cta-banner-sub">No pressure. No runaround. Let's talk about what you need.</p>
    </div>
    <div class="cta-banner-actions">
      <a href="${data.email ? emailHref : data.phone ? phoneHref : data.url}" class="btn-fill">${copy.cta} →</a>
      <a href="${data.url}" target="_blank" rel="noopener" class="btn-outline">View Current Site ↗</a>
    </div>
  </div>
</div>

<!-- Footer -->
<footer class="footer">
  <div class="footer-left">
    <div class="footer-name">${data.businessName}</div>
    <div class="footer-domain">${domain}</div>
  </div>
  <div class="footer-credit">Preview by <a href="https://randybuilds.ca" target="_blank">RandyBuilds</a> — Alberta web design from $800</div>
</footer>

<!-- Sticky bottom bar -->
<div class="bottom-bar" id="bottom-bar">
  <p class="bottom-bar-text"><strong>Free redesign preview.</strong> This is what your site could look like in 2 weeks.</p>
  <a href="https://randybuilds.ca" target="_blank" class="bottom-bar-cta">Get This Site →</a>
</div>

<script>
// ── Nav solid on scroll ───────────────────────────────────────────────
const nav = document.getElementById("nav");
const bar = document.getElementById("bottom-bar");
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  nav.classList.toggle("solid", y > 40);
  bar.classList.toggle("visible", y > window.innerHeight * 0.6);
}, {passive:true});

// ── Reveal on scroll ──────────────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      e.target.querySelectorAll(".svc-card").forEach(c => c.classList.add("in"));
    }
  });
}, {threshold: 0.08, rootMargin:"0px 0px -40px 0px"});
document.querySelectorAll(".reveal,.reveal-left,.reveal-right,.svc-list").forEach(el => io.observe(el));

// ── Ticker clone for seamless loop ────────────────────────────────────
const track = document.getElementById("ticker");
if (track) {
  const clone = track.cloneNode(true);
  track.parentElement.appendChild(clone);
}
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

    if (!data.businessName || !data.url) {
      return NextResponse.json({ error: "businessName and url are required" }, { status: 400 });
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
