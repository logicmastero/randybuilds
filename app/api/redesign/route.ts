import { NextRequest, NextResponse } from "next/server";
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
  if (/payment|checkout|billing|invoice|merchant|gateway|fintech|stripe|square|paypal/.test(text))
    return { label: "fintech / payments platform", defaultCta: "Start for Free", defaultCtaSecondary: "View Pricing", systemPersona: "conversion copywriter for B2B SaaS and fintech products" };

  if (/saas|software|platform|api|sdk|developer|dashboard|cloud|devops|infra|deployment|ci\/cd|pipeline/.test(text))
    return { label: "developer tools / SaaS platform", defaultCta: "Start Building Free", defaultCtaSecondary: "Read the Docs", systemPersona: "conversion copywriter for developer-focused SaaS products" };

  if (/ecommerce|e-commerce|shop|store|product|cart|shipping|dropship|woocommerce|shopify/.test(text))
    return { label: "e-commerce platform or store", defaultCta: "Shop Now", defaultCtaSecondary: "See Collections", systemPersona: "conversion copywriter for e-commerce brands and online stores" };

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

async function generateRedesignCopy(
  data: ScrapedInput
): Promise<{ copy: RedesignCopy; source: "claude" | "fallback"; reason?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("[redesign] ANTHROPIC_API_KEY not set — using fallback");
    return { copy: buildFallbackCopy(data), source: "fallback", reason: "no_api_key" };
  }

  const vertical = detectVertical(data);
  console.log(`[redesign] Vertical detected: "${vertical.label}" for ${data.businessName} (${data.url})`);

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a world-class ${vertical.systemPersona}. You write copy that is sharp, specific, and converts. You never use generic filler phrases. You understand that ${vertical.label} businesses have a specific audience with specific needs, and you write directly to that audience's outcome.

Output strict JSON only. No markdown, no explanation, no wrapper text. Just the raw JSON object.`;

  const hasServices = data.services.filter(s => s.length > 3).length > 0;
  const servicesText = hasServices
    ? data.services.filter(s => s.length > 3).join(", ")
    : "Not found on page — infer from business type and description";

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
2. The subhead is ONE specific sentence (max 18 words) that speaks to the TARGET USER of a ${vertical.label} — not generic.
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

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    console.log(`[redesign] Claude raw response (first 300 chars): ${raw.slice(0, 300)}`);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[redesign] Claude returned no valid JSON. Raw:", raw.slice(0, 500));
      throw new Error("No JSON in Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.headline || !parsed.subhead || !parsed.cta) {
      throw new Error("Claude JSON missing required fields");
    }

    const fallback = buildFallbackCopy(data, vertical);
    const copy: RedesignCopy = {
      headline:        parsed.headline,
      subhead:         parsed.subhead,
      services:        Array.isArray(parsed.services) && parsed.services.length > 0
                         ? parsed.services
                         : fallback.services,
      cta:             parsed.cta,
      ctaSecondary:    parsed.ctaSecondary || vertical.defaultCtaSecondary,
      closingHeadline: parsed.closingHeadline || fallback.closingHeadline,
    };

    console.log(`[redesign] ✓ Claude success — headline: "${copy.headline}", cta: "${copy.cta}"`);
    return { copy, source: "claude" };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[redesign] Claude failed (${msg}) — falling back`);
    return { copy: buildFallbackCopy(data, vertical), source: "fallback", reason: msg };
  }
}

// ─── Fallback copy (vertical-aware) ──────────────────────────────────────────

function buildFallbackCopy(data: ScrapedInput, vertical?: VerticalProfile): RedesignCopy {
  const v = vertical || detectVertical(data);
  const services = data.services.filter(s => s.length > 3);
  const serviceItems = services.length > 0
    ? services.map(s => ({ title: s, desc: "Built to deliver results for your business." }))
    : [
        { title: "Core Product", desc: "Purpose-built for the needs of your customers." },
        { title: "Integrations", desc: "Connects seamlessly with the tools you already use." },
        { title: "Support", desc: "Real help from real people when you need it." },
      ];

  return {
    headline: `Built for ${v.label.split("/")[0].trim().charAt(0).toUpperCase() + v.label.split("/")[0].trim().slice(1)}.`,
    subhead: `${data.businessName} — purpose-built for the people who depend on it most.`,
    services: serviceItems,
    cta: v.defaultCta,
    ctaSecondary: v.defaultCtaSecondary,
    closingHeadline: "Ready to take the next step?",
  };
}

// ─── Preview HTML builder ─────────────────────────────────────────────────────

function buildPreviewHTML(data: ScrapedInput, copy: RedesignCopy, source: "claude" | "fallback"): string {
  const primary   = data.colors[0] || "#00f5a0";
  const secondary = data.colors[1] || "#00d9f5";
  const r = parseInt(primary.slice(1,3),16);
  const g = parseInt(primary.slice(3,5),16);
  const b = parseInt(primary.slice(5,7),16);

  const servicesHTML = copy.services.map(s => `
    <div class="card">
      <div class="card-title">${s.title}</div>
      <div class="card-desc">${s.desc}</div>
    </div>`).join("");

  const aiBadge = source === "claude"
    ? `<div class="ai-badge">⚡ AI-Written Copy</div>`
    : `<div class="ai-badge fallback-badge">📝 Template Copy</div>`;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.businessName} — Premium Redesign by RandyBuilds</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#080808;color:#f0f0f0;overflow-x:hidden;padding-bottom:72px}
.grad{background:linear-gradient(135deg,${primary},${secondary});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:18px 48px;background:rgba(8,8,8,.95);backdrop-filter:blur(20px);border-bottom:1px solid #151515}
.logo{font-weight:900;font-size:1.3rem;letter-spacing:-.02em;color:#f0f0f0}
.nav-cta{padding:10px 22px;border-radius:8px;font-weight:700;font-size:.85rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary})}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 80px;position:relative;background-image:linear-gradient(rgba(${r},${g},${b},.025) 1px,transparent 1px),linear-gradient(90deg,rgba(${r},${g},${b},.025) 1px,transparent 1px);background-size:50px 50px}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(${r},${g},${b},.09) 0%,transparent 70%);pointer-events:none}
.badge{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:999px;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:28px;background:rgba(${r},${g},${b},.08);border:1px solid rgba(${r},${g},${b},.2);color:${primary}}
.ai-badge{display:inline-block;position:fixed;bottom:80px;right:20px;padding:6px 14px;border-radius:999px;font-size:.7rem;font-weight:700;background:rgba(0,245,160,.12);border:1px solid rgba(0,245,160,.3);color:#00f5a0;z-index:200}
.fallback-badge{background:rgba(255,200,0,.1);border-color:rgba(255,200,0,.3);color:#ffc800}
h1{font-size:clamp(2.8rem,7vw,6rem);font-weight:900;line-height:1.05;letter-spacing:-.03em;margin-bottom:20px}
.subhead{font-size:clamp(1rem,2vw,1.3rem);color:#888;max-width:600px;line-height:1.6;margin-bottom:40px}
.cta-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.cta-primary{padding:16px 36px;border-radius:12px;font-weight:800;font-size:1rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary});transition:transform .15s,box-shadow .15s}
.cta-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(${r},${g},${b},.35)}
.cta-secondary{padding:16px 36px;border-radius:12px;font-weight:700;font-size:1rem;text-decoration:none;color:#f0f0f0;border:1px solid #333;transition:border-color .15s}
.cta-secondary:hover{border-color:${primary}}
.services{padding:80px 24px;max-width:1100px;margin:0 auto}
.services h2{font-size:clamp(1.8rem,4vw,3rem);font-weight:900;text-align:center;margin-bottom:12px;letter-spacing:-.02em}
.services-sub{text-align:center;color:#666;margin-bottom:48px;font-size:1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.card{background:#0e0e0e;border:1px solid #1a1a1a;border-radius:16px;padding:28px;transition:border-color .2s,transform .2s}
.card:hover{border-color:rgba(${r},${g},${b},.3);transform:translateY(-3px)}
.card-title{font-size:1.05rem;font-weight:700;margin-bottom:10px;color:#f0f0f0}
.card-desc{font-size:.9rem;color:#666;line-height:1.6}
.closing{padding:80px 24px;text-align:center}
.closing h2{font-size:clamp(2rem,5vw,4rem);font-weight:900;line-height:1.1;letter-spacing:-.03em;margin-bottom:24px}
.banner{position:fixed;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px 32px;background:rgba(10,10,10,.97);border-top:1px solid #1f1f1f;z-index:200;backdrop-filter:blur(12px)}
.bt{font-size:.85rem;color:#888}
.bt strong{color:#f0f0f0}
.bc{padding:9px 22px;border-radius:8px;font-weight:700;font-size:.85rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary})}
</style></head><body>
<nav>
  <div class="logo">${data.businessName}</div>
  <a class="nav-cta" href="#">${copy.cta}</a>
</nav>
${aiBadge}
<section class="hero">
  <div class="badge">✦ Redesign Preview by RandyBuilds</div>
  <h1><span class="grad">${copy.headline}</span></h1>
  <p class="subhead">${copy.subhead}</p>
  <div class="cta-row">
    <a class="cta-primary" href="#">${copy.cta}</a>
    <a class="cta-secondary" href="#">${copy.ctaSecondary}</a>
  </div>
</section>
<section class="services">
  <h2>What We <span class="grad">Do Best</span></h2>
  <p class="services-sub">Everything you need, nothing you don't.</p>
  <div class="grid">${servicesHTML}</div>
</section>
<section class="closing">
  <h2><span class="grad">${copy.closingHeadline}</span></h2>
  <div class="cta-row" style="margin-top:32px">
    <a class="cta-primary" href="#">${copy.cta}</a>
    <a class="cta-secondary" href="#">${copy.ctaSecondary}</a>
  </div>
</section>
<div class="banner">
  <div class="bt">👀 <strong>Free preview.</strong> This is what your site could look like — built by RandyBuilds.</div>
  <a href="/" class="bc">Buy This Site →</a>
</div>
</body></html>`;
}

// ─── Shared preview store (in-memory, serverless-compatible within warm instance) ──
export const previewStore = new Map<string, {
  html: string;
  businessName: string;
  createdAt: number;
}>();

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

    const slug = data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    previewStore.set(slug, { html, businessName: data.businessName, createdAt: Date.now() });
    if (previewStore.size > 200) {
      const oldest = [...previewStore.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      previewStore.delete(oldest[0]);
    }

    return NextResponse.json({
      previewUrl: `/preview/${slug}`,
      previewHtml: html,
      businessName: data.businessName,
      slug,
      copy,
      source,         // "claude" | "fallback"
      fallbackReason: reason ?? null,
      aiPowered: source === "claude",
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[redesign] Fatal error:", msg);
    return NextResponse.json({ error: "Failed to generate redesign", detail: msg }, { status: 500 });
  }
}
