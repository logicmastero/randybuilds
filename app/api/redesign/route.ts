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
  // ── Color system ────────────────────────────────────────────────────────────
  const images = (data as ScrapedInput & { images?: string[] }).images ?? [];
  const primary   = data.colors[0] || "#2563eb";
  const secondary = data.colors[1] || primary;

  // Determine if primary is light or dark to set theme
  const hex = primary.replace("#","");
  const rr = parseInt(hex.slice(0,2),16), gg = parseInt(hex.slice(2,4),16), bb2 = parseInt(hex.slice(4,6),16);
  const luminance = (0.299*rr + 0.587*gg + 0.114*bb2)/255;
  const isDark = luminance < 0.45;

  const bg       = isDark ? "#fafafa" : "#0a0a0a";
  const bgCard   = isDark ? "#ffffff" : "#111111";
  const bgMuted  = isDark ? "#f4f4f5" : "#161616";
  const border   = isDark ? "#e4e4e7" : "#1f1f1f";
  const textMain = isDark ? "#09090b" : "#f4f4f5";
  const textMid  = isDark ? "#52525b" : "#a1a1aa";
  const textDim  = isDark ? "#71717a" : "#71717a";
  const navBg    = isDark ? "rgba(250,250,250,0.95)" : "rgba(10,10,10,0.97)";
  const navBdr   = isDark ? "#e4e4e7" : "#1f1f1f";
  const shadowColor = isDark ? `rgba(${rr},${gg},${bb2},.15)` : `rgba(${rr},${gg},${bb2},.25)`;
  const orbColor1 = `rgba(${rr},${gg},${bb2},${isDark ? "0.12" : "0.18"})`;
  const orbColor2 = `rgba(${parseInt(secondary.replace("#","").slice(0,2),16)},${parseInt(secondary.replace("#","").slice(2,4),16)},${parseInt(secondary.replace("#","").slice(4,6),16)},${isDark ? "0.08" : "0.14"})`;

  // ── Logo rendering ─────────────────────────────────────────────────────────
  const logoHTML = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName} logo" class="logo-img" onerror="this.style.display='none';document.getElementById('logo-text').style.display='block'">`
      + `<span id="logo-text" class="logo-text" style="display:none">${data.businessName}</span>`
    : `<span class="logo-text">${data.businessName}</span>`;

  // ── Premium hero logo + background image ─────────────────────────────────
  const heroLogoHTML = data.logoUrl
    ? `<div class="hero-logo-wrap"><img src="${data.logoUrl}" alt="${data.businessName}" class="hero-logo" onerror="this.closest('.hero-logo-wrap').innerHTML='<span class=\"hero-logo-text\">${data.businessName}</span>'"></div>`
    : `<div class="hero-logo-wrap"><span class="hero-logo-text">${data.businessName}</span></div>`;

  const heroBgImg = images.length > 0 ? images[0] : null;
  const serviceImages = images.slice(1, 4);
  const extraImages = images.slice(4, 10);

  // ── Services grid ──────────────────────────────────────────────────────────
  const SERVICE_ICONS = ["◆","◈","◉","▲","✦","⬡"];
  const servicesHTML = copy.services.map((s, i) => `
    <div class="card" style="--i:${i}">
      <div class="card-icon-wrap">
        <span class="card-icon">${SERVICE_ICONS[i % SERVICE_ICONS.length]}</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${s.title}</h3>
        <p class="card-desc">${s.desc}</p>
      </div>
    </div>`).join("");

  // ── Stats strip (trust signals) ────────────────────────────────────────────
  const domain = (() => { try { return new URL(data.url).hostname.replace("www.",""); } catch { return data.url; } })();

  // ── Phone / contact pill ───────────────────────────────────────────────────
  const contactPill = data.phone
    ? `<a href="tel:${data.phone.replace(/\D/g,"")}" class="contact-pill">📞 ${data.phone}</a>`
    : data.email
      ? `<a href="mailto:${data.email}" class="contact-pill">✉ ${data.email}</a>`
      : "";

  const aiBadge = source === "claude"
    ? `<div class="ai-badge">⚡ AI Copy <span class="claude-credit">Powered by Claude AI</span></div>`
    : `<div class="ai-badge fallback-badge">📝 Template Preview</div>`;

  // ── Stat numbers (vertical-aware) ─────────────────────────────────────────
  const isLocal = /contractor|trades|plumb|electr|roof|hvac|landscap|clean|auto|restaurant|dental|salon|weld|mechanic|tow/.test(
    [data.description, ...data.services].join(" ").toLowerCase()
  );
  const stats = isLocal
    ? [["5-Star","Reviews"],["Licensed","& Insured"],["Fast","Response"],["Free","Estimates"]]
    : [["99.9%","Uptime SLA"],["<50ms","Response Time"],["256-bit","Encryption"],["24/7","Support"]];

  const statsHTML = stats.map(([num,label]) => `
    <div class="stat-item">
      <div class="stat-num">${num}</div>
      <div class="stat-label">${label}</div>
    </div>`).join(`<div class="stat-div"></div>`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.businessName} — Premium Redesign by RandyBuilds</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
<style>
/* ── Reset & base ─────────────────────────────────────────────────────── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,sans-serif;background:${bg};color:${textMain};overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* ── Scroll-reveal ────────────────────────────────────────────────────── */
.reveal{opacity:0;transform:translateY(24px);transition:opacity .6s cubic-bezier(.16,1,.3,1),transform .6s cubic-bezier(.16,1,.3,1)}
.reveal.visible{opacity:1;transform:none}

/* ── Navigation ───────────────────────────────────────────────────────── */
nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:0 48px;height:68px;background:${navBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid ${navBdr};transition:box-shadow .2s}
nav.scrolled{box-shadow:0 4px 32px ${shadowColor}}
.logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-img{height:34px;width:auto;object-fit:contain;display:block}
.hero-logo-wrap{display:flex;align-items:center;justify-content:center;margin-bottom:36px;animation:logo-in .6s cubic-bezier(.16,1,.3,1) both}
@keyframes logo-in{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
.hero-logo{height:90px;width:auto;max-width:340px;object-fit:contain;filter:drop-shadow(0 0 32px ${primary}66) drop-shadow(0 4px 20px rgba(0,0,0,.6));transition:filter .3s}
.hero-logo:hover{filter:drop-shadow(0 0 56px ${primary}99) drop-shadow(0 4px 28px rgba(0,0,0,.7))}
.hero-logo-text{font-size:2.8rem;font-weight:900;letter-spacing:-.04em;color:${primary};text-shadow:0 0 40px ${primary}88}
.hero-bg-photo{position:absolute;inset:0;z-index:0;background-image:url(${heroBgImg || ""});background-size:cover;background-position:center;opacity:.18}
.hero-bg-vignette{position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,${bg} 0%,rgba(0,0,0,0) 25%,rgba(0,0,0,0) 75%,${bg} 100%)}
.logo-text{font-weight:900;font-size:1.25rem;letter-spacing:-.03em;color:${textMain};white-space:nowrap}
.nav-links{display:flex;align-items:center;gap:32px}
.nav-links a{font-size:.875rem;font-weight:500;color:${textMid};text-decoration:none;transition:color .15s}
.nav-links a:hover{color:${primary}}
.nav-cta{padding:10px 24px;border-radius:10px;font-weight:700;font-size:.875rem;text-decoration:none;color:#fff !important;background:${primary};transition:opacity .15s,transform .15s;white-space:nowrap}
.nav-cta:hover{opacity:.88;transform:translateY(-1px)}

/* ── Hero ─────────────────────────────────────────────────────────────── */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:140px 24px 100px;position:relative;overflow:hidden}
.hero-bg{position:absolute;inset:0;z-index:0;background:${bg}}
.orb{position:absolute;border-radius:50%;filter:blur(100px);pointer-events:none}
.orb-1{width:800px;height:800px;top:-320px;left:-200px;background:radial-gradient(circle,${orbColor1} 0%,transparent 65%);animation:drift1 18s ease-in-out infinite alternate}
.orb-2{width:600px;height:600px;bottom:-200px;right:-150px;background:radial-gradient(circle,${orbColor2} 0%,transparent 65%);animation:drift2 24s ease-in-out infinite alternate}
.orb-3{width:400px;height:400px;top:50%;left:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,${orbColor1} 0%,transparent 60%);opacity:.35;animation:drift3 30s ease-in-out infinite alternate}
@keyframes drift1{0%{transform:translate(0,0)}100%{transform:translate(80px,60px)}}
@keyframes drift2{0%{transform:translate(0,0)}100%{transform:translate(-60px,-40px)}}
@keyframes drift3{0%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(1.3)}}
.hero-grid{position:absolute;inset:0;background-image:linear-gradient(${border}40 1px,transparent 1px),linear-gradient(90deg,${border}40 1px,transparent 1px);background-size:64px 64px;z-index:0;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)}
.hero>*:not(.hero-bg):not(.orb):not(.hero-grid){position:relative;z-index:1}
.hero-eyebrow{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:999px;font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:32px;background:${isDark ? `rgba(${rr},${gg},${bb2},.08)` : `rgba(${rr},${gg},${bb2},.12)`};border:1px solid ${isDark ? `rgba(${rr},${gg},${bb2},.2)` : `rgba(${rr},${gg},${bb2},.3)`};color:${primary};animation:eyebrow-in .5s cubic-bezier(.16,1,.3,1) both}
@keyframes eyebrow-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
h1.hero-headline{font-family:'Playfair Display',Georgia,serif;font-size:clamp(3rem,8vw,7rem);font-weight:900;line-height:1.0;letter-spacing:-.04em;margin-bottom:28px;animation:headline-in .7s cubic-bezier(.16,1,.3,1) both .1s}
@keyframes headline-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.hero-headline .grad{background:linear-gradient(135deg,${primary} 0%,${secondary} 60%,${primary} 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite}
@keyframes shimmer{0%{background-position:0% 50%}100%{background-position:200% 50%}}
.hero-sub{font-size:clamp(1.05rem,2.2vw,1.35rem);color:${textMid};max-width:640px;line-height:1.7;margin-bottom:48px;animation:sub-in .7s cubic-bezier(.16,1,.3,1) both .2s}
@keyframes sub-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.cta-row{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;animation:cta-in .7s cubic-bezier(.16,1,.3,1) both .3s}
@keyframes cta-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:17px 38px;border-radius:12px;font-weight:800;font-size:1rem;text-decoration:none;color:#fff;background:${primary};box-shadow:0 0 0 0 ${primary}44;transition:transform .15s,box-shadow .2s,opacity .15s;position:relative;overflow:hidden}
.btn-primary::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.15),transparent);pointer-events:none}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 40px ${isDark ? `rgba(${rr},${gg},${bb2},.3)` : `rgba(${rr},${gg},${bb2},.4)`};opacity:.95}
.btn-primary:active{transform:translateY(0)}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:17px 38px;border-radius:12px;font-weight:700;font-size:1rem;text-decoration:none;color:${textMain};border:1.5px solid ${border};background:transparent;transition:border-color .15s,background .15s,transform .15s}
.btn-secondary:hover{border-color:${primary};background:${isDark ? `rgba(${rr},${gg},${bb2},.04)` : `rgba(${rr},${gg},${bb2},.08)`};transform:translateY(-2px)}
.btn-arrow{font-size:1.1rem;transition:transform .15s}
.btn-primary:hover .btn-arrow,.btn-secondary:hover .btn-arrow{transform:translateX(4px)}
${contactPill ? `.contact-pill{display:inline-flex;align-items:center;gap:8px;margin-top:24px;padding:10px 22px;border-radius:999px;font-size:.9rem;font-weight:600;color:${primary};text-decoration:none;border:1.5px solid ${isDark ? `rgba(${rr},${gg},${bb2},.25)` : `rgba(${rr},${gg},${bb2},.35)`};background:${isDark ? `rgba(${rr},${gg},${bb2},.06)` : `rgba(${rr},${gg},${bb2},.1)`};transition:background .15s,transform .15s}
.contact-pill:hover{background:${isDark ? `rgba(${rr},${gg},${bb2},.12)` : `rgba(${rr},${gg},${bb2},.18)`};transform:translateY(-1px)}` : ""}

/* ── Trust bar ────────────────────────────────────────────────────────── */
.trust{padding:40px 24px;border-top:1px solid ${border};border-bottom:1px solid ${border};background:${bgMuted}}
.trust-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap}
.stat-item{text-align:center;padding:16px 36px;flex:1;min-width:120px}
.stat-num{font-size:1.5rem;font-weight:900;letter-spacing:-.03em;color:${primary};line-height:1}
.stat-label{font-size:.78rem;font-weight:600;color:${textMid};letter-spacing:.06em;text-transform:uppercase;margin-top:6px}
.stat-div{width:1px;height:40px;background:${border};flex-shrink:0}

/* ── Services ─────────────────────────────────────────────────────────── */
.services-section{padding:100px 24px;max-width:1160px;margin:0 auto}
.section-label{font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${primary};margin-bottom:16px}
.section-title{font-family:'Playfair Display',Georgia,serif;font-size:clamp(2rem,5vw,3.6rem);font-weight:900;letter-spacing:-.03em;line-height:1.1;margin-bottom:16px;color:${textMain}}
.section-sub{font-size:1.05rem;color:${textMid};max-width:560px;line-height:1.7;margin-bottom:64px}
.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.card{background:${bgCard};border:1px solid ${border};border-radius:20px;padding:32px;display:flex;align-items:flex-start;gap:20px;transition:border-color .2s,transform .2s,box-shadow .2s;opacity:0;transform:translateY(20px);transition:opacity .5s cubic-bezier(.16,1,.3,1) calc(var(--i)*80ms), transform .5s cubic-bezier(.16,1,.3,1) calc(var(--i)*80ms), border-color .2s, box-shadow .2s}
.card.visible{opacity:1;transform:translateY(0)}
.card:hover{border-color:${primary}44;transform:translateY(-4px);box-shadow:0 20px 60px ${shadowColor}}
.card-icon-wrap{width:48px;height:48px;border-radius:14px;background:${isDark ? `rgba(${rr},${gg},${bb2},.1)` : `rgba(${rr},${gg},${bb2},.15)`};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.card-icon{font-size:1.3rem;color:${primary}}
.card-body{}
.card-title{font-size:1.05rem;font-weight:700;color:${textMain};margin-bottom:10px;line-height:1.3}
.card-desc{font-size:.9rem;color:${textMid};line-height:1.65}

/* ── About strip ──────────────────────────────────────────────────────── */
.about{padding:80px 24px;background:${bgMuted};border-top:1px solid ${border};border-bottom:1px solid ${border}}
.about-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.about-text .section-label{margin-bottom:12px}
.about-headline{font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:900;letter-spacing:-.03em;line-height:1.15;margin-bottom:20px;color:${textMain}}
.about-body{font-size:1rem;color:${textMid};line-height:1.8}
.about-visual{background:${bgCard};border:1px solid ${border};border-radius:24px;padding:36px;display:flex;flex-direction:column;gap:20px}
.about-stat-row{display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid ${border}}
.about-stat-row:last-child{border-bottom:none}
.about-stat-num{font-size:2rem;font-weight:900;color:${primary};min-width:72px;letter-spacing:-.04em}
.about-stat-desc{font-size:.9rem;color:${textMid};line-height:1.5}

/* ── CTA closing ──────────────────────────────────────────────────────── */
.closing{padding:120px 24px;text-align:center;position:relative;overflow:hidden}
.closing-orb{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;border-radius:50%;filter:blur(120px);background:radial-gradient(circle,${orbColor1},transparent 70%);pointer-events:none;z-index:0}
.closing>*:not(.closing-orb){position:relative;z-index:1}
.closing-headline{font-family:'Playfair Display',Georgia,serif;font-size:clamp(2.4rem,6vw,5rem);font-weight:900;line-height:1.05;letter-spacing:-.04em;margin-bottom:28px;color:${textMain}}
.closing-sub{font-size:1.1rem;color:${textMid};max-width:500px;margin:0 auto 48px;line-height:1.7}

/* ── Footer ───────────────────────────────────────────────────────────── */
footer{padding:32px 48px;background:${bgMuted};border-top:1px solid ${border};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
.footer-logo{font-weight:900;font-size:1.1rem;letter-spacing:-.03em;color:${textMid}}
.footer-domain{font-size:.85rem;color:${textDim}}
.footer-credit{font-size:.78rem;color:${textDim}}
.footer-credit a{color:${primary};text-decoration:none;font-weight:700}
.footer-credit a:hover{text-decoration:underline}

/* ── AI badge ─────────────────────────────────────────────────────────── */
.ai-badge{position:fixed;bottom:24px;right:24px;display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;font-size:.7rem;font-weight:700;background:rgba(0,245,160,.1);border:1px solid rgba(0,245,160,.3);color:#00f5a0;z-index:300;backdrop-filter:blur(12px)}
.fallback-badge{background:rgba(255,200,0,.1);border-color:rgba(255,200,0,.3);color:#ffc800}
.claude-credit{font-size:.68rem;font-weight:500;opacity:.75;padding-left:8px;border-left:1px solid rgba(0,245,160,.3);margin-left:4px}

/* ── Sticky banner ────────────────────────────────────────────────────── */
.banner{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px 36px;background:${navBg};border-top:1px solid ${navBdr};z-index:250;backdrop-filter:blur(16px)}
.banner-text{font-size:.85rem;color:${textMid}}
.banner-text strong{color:${textMain}}
.banner-cta{padding:10px 24px;border-radius:10px;font-weight:700;font-size:.875rem;text-decoration:none;color:#fff;background:${primary};transition:opacity .15s,transform .15s}
.banner-cta:hover{opacity:.88;transform:translateY(-1px)}

/* ── Responsive ───────────────────────────────────────────────────────── */
@media(max-width:1024px){.about-inner{grid-template-columns:1fr;gap:48px}}
.feature-strip{overflow:hidden;border-top:1px solid ${border};border-bottom:1px solid ${border}}
.feature-strip-inner{display:flex;height:300px}
.feature-img-cell{flex:1;overflow:hidden;position:relative}
.feature-img-cell img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s cubic-bezier(.16,1,.3,1)}
.feature-img-cell:hover img{transform:scale(1.06)}
.feature-img-cell+.feature-img-cell{border-left:1px solid ${border}}
.work-section{padding:100px 48px;max-width:1360px;margin:0 auto}
.work-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.work-mosaic{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:190px 190px;gap:12px}
.work-mosaic [class^="mosaic-"]{border-radius:14px;overflow:hidden;background:${bgCard};border:1px solid ${border};transition:transform .2s,box-shadow .2s}
.work-mosaic [class^="mosaic-"]:hover{transform:translateY(-4px);box-shadow:0 20px 48px ${shadowColor}}
.work-mosaic [class^="mosaic-"] img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.16,1,.3,1)}
.work-mosaic [class^="mosaic-"]:hover img{transform:scale(1.07)}
.mosaic-0{grid-row:span 2}
@media(max-width:900px){.work-inner{grid-template-columns:1fr}.work-mosaic{grid-template-rows:160px;grid-template-columns:repeat(3,1fr)}.mosaic-0{grid-row:span 1}}
@media(max-width:600px){.feature-strip-inner{height:200px}.feature-img-cell:nth-child(3){display:none}.work-mosaic{grid-template-columns:repeat(2,1fr)}.work-mosaic [class^="mosaic-"]:nth-child(4){display:none}}

@media(max-width:768px){
  nav{padding:0 20px}
  .nav-links{display:none}
  .hero{padding:120px 20px 80px}
  h1.hero-headline{font-size:clamp(2.6rem,10vw,4.5rem)}
  .services-grid{grid-template-columns:1fr}
  .trust-inner{gap:0}
  .stat-item{min-width:50%;padding:16px 12px}
  .stat-div{display:none}
  footer{flex-direction:column;align-items:flex-start;padding:24px 20px}
  .banner{padding:12px 20px}
}
</style>
</head>
<body>

<!-- Nav -->
<nav id="nav">
  <a href="#" class="logo-wrap">${logoHTML}</a>
  <div class="nav-links">
    <a href="#services">Services</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
  </div>
  <a href="#contact" class="nav-cta">${copy.cta} <span class="btn-arrow">→</span></a>
</nav>

${aiBadge}

<!-- Hero -->
<section class="hero">
  <div class="hero-bg"></div>
  ${heroBgImg ? '<div class="hero-bg-photo"></div><div class="hero-bg-vignette"></div>' : ''}
  <div class="hero-grid"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
  ${heroLogoHTML}
  <div class="hero-eyebrow">✦ Premium Redesign Preview by RandyBuilds</div>
  <h1 class="hero-headline"><span class="grad">${copy.headline}</span></h1>
  <p class="hero-sub">${copy.subhead}</p>
  <div class="cta-row">
    <a href="#contact" class="btn-primary">${copy.cta} <span class="btn-arrow">→</span></a>
    <a href="#services" class="btn-secondary">${copy.ctaSecondary} <span class="btn-arrow">↓</span></a>
  </div>
  ${contactPill}
</section>

<!-- Trust bar -->
<section class="trust reveal">
  <div class="trust-inner">${statsHTML}</div>
</section>

<!-- Services -->
<section class="services-section" id="services">
  <div class="reveal">
    <div class="section-label">What We Do</div>
    <h2 class="section-title">Services built to <span style="color:${primary}">perform</span></h2>
    <p class="section-sub">Every service is designed to deliver results — not just check a box.</p>
  </div>
  <div class="services-grid">${servicesHTML}</div>
</section>

<!-- Image Gallery -->
${serviceImages.length > 0 ? `
<section class="feature-strip">
  <div class="feature-strip-inner">
    ${serviceImages.map((img: string) => `
      <div class="feature-img-cell">
        <img src="${img}" alt="${data.businessName}" loading="lazy" onerror="this.closest('.feature-img-cell').style.display='none'">
      </div>
    `).join("")}
  </div>
</section>
` : ""}

${extraImages.length > 0 ? `
<section class="work-section reveal">
  <div class="work-inner">
    <div class="work-text">
      <div class="section-label">On The Job</div>
      <h2 class="section-title">Fleet-ready for <span style="color:${primary}">your site</span></h2>
      <p class="section-sub">Every unit is maintained, load-tested, and ready to deploy. We keep your job site running.</p>
      <a href="#contact" class="btn-primary" style="margin-top:28px;display:inline-flex">${copy.cta} <span class="btn-arrow">→</span></a>
    </div>
    <div class="work-mosaic">
      ${extraImages.slice(0,4).map((img: string, i: number) => `
        <div class="mosaic-${i}">
          <img src="${img}" alt="${data.businessName} equipment" loading="lazy" onerror="this.closest('[class^=mosaic]').style.display='none'">
        </div>
      `).join("")}
    </div>
  </div>
</section>
` : ""}

<!-- About -->
<section class="about" id="about">
  <div class="about-inner">
    <div class="about-text reveal">
      <div class="section-label">Our Story</div>
      <h2 class="about-headline">Built on craft.<br>Backed by results.</h2>
      <p class="about-body">${data.description || `${data.businessName} has been delivering exceptional results for clients who demand the best. Every project we take on is treated with precision, care, and a commitment to excellence that shows in the work.`}</p>
    </div>
    <div class="about-visual reveal">
      <div class="about-stat-row"><div class="about-stat-num" style="color:${primary}">100%</div><div class="about-stat-desc">Client satisfaction rate — we don't walk away until the job is done right.</div></div>
      <div class="about-stat-row"><div class="about-stat-num" style="color:${primary}">Fast</div><div class="about-stat-desc">Quick turnaround without cutting corners. Efficient, professional, reliable.</div></div>
      <div class="about-stat-row"><div class="about-stat-num" style="color:${primary}">${data.phone ? data.phone : "Local"}</div><div class="about-stat-desc">${data.phone ? "Call us directly — real people, no runaround." : `Proudly serving ${data.address ? data.address.split(",").slice(-2).join(",").trim() : "the local community"}.`}</div></div>
    </div>
  </div>
</section>

<!-- CTA Closing -->
<section class="closing" id="contact">
  <div class="closing-orb"></div>
  <div class="reveal">
    <h2 class="closing-headline">${copy.closingHeadline}</h2>
    <p class="closing-sub">Ready to see results? Let's get started — no pressure, no runaround.</p>
    <div class="cta-row">
      <a href="${data.email ? `mailto:${data.email}` : data.phone ? `tel:${data.phone.replace(/\D/g,"")}` : "#"}" class="btn-primary">${copy.cta} <span class="btn-arrow">→</span></a>
      <a href="${data.url}" target="_blank" rel="noopener" class="btn-secondary">View Current Site <span class="btn-arrow">↗</span></a>
    </div>
  </div>
</section>

<!-- Footer -->
<footer>
  <div>
    <div class="footer-logo">${data.businessName}</div>
    <div class="footer-domain">${domain}</div>
  </div>
  <div class="footer-credit">Preview built by <a href="https://randybuilds.ca" target="_blank">RandyBuilds</a> — Alberta web design from $800</div>
</footer>

<!-- Sticky banner -->
<div class="banner">
  <div class="banner-text">👀 <strong>Free redesign preview.</strong> This is what your site could look like in 2 weeks.</div>
  <a href="https://randybuilds.ca" target="_blank" class="banner-cta">Get This Site →</a>
</div>

<script>
// ── Scroll reveal ────────────────────────────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      // Also reveal child cards
      e.target.querySelectorAll(".card").forEach(c => c.classList.add("visible"));
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal, .services-grid").forEach(el => io.observe(el));

// ── Nav shadow on scroll ─────────────────────────────────────────────────
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 20);
}, { passive: true });

// ── Shimmer headline on hover ─────────────────────────────────────────────
const hl = document.querySelector(".hero-headline .grad");
if (hl) hl.addEventListener("mouseenter", () => {
  hl.style.animationDuration = "1s";
});
if (hl) hl.addEventListener("mouseleave", () => {
  hl.style.animationDuration = "4s";
});
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
