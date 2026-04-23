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

function inferIndustry(data: ScrapedInput): string {
  const text = [data.businessName, data.description, ...data.services, data.headline]
    .join(" ").toLowerCase();

  const industries: [RegExp, string][] = [
    [/plumb|pipe|drain|sewer|water heater/,         "plumbing"],
    [/electr|wiring|panel|breaker|outlet/,           "electrical"],
    [/roof|shingle|gutter|skylight|eave/,            "roofing"],
    [/hvac|furnace|air condition|heat pump|ductwork/, "HVAC"],
    [/landscap|lawn|garden|sod|irrigation/,           "landscaping"],
    [/clean|maid|janitorial|pressure wash/,          "cleaning services"],
    [/auto|car|vehicle|mechanic|tire|oil change/,    "automotive"],
    [/restaurant|cafe|food|menu|catering|diner/,     "restaurant"],
    [/dental|dentist|teeth|orthodont/,               "dental"],
    [/legal|lawyer|attorney|law firm/,               "legal"],
    [/real estate|realt|mortgage|homes for sale/,    "real estate"],
    [/gym|fitness|personal train|yoga|crossfit/,     "fitness"],
    [/salon|hair|barber|beauty|nail/,                "beauty & salon"],
    [/construct|build|contractor|renovation|remodel/, "construction"],
    [/weld|fabricat|metal|steel|pipe fit/,           "welding & fabrication"],
    [/tow|roadside|recovery|vehicle transport/,      "towing"],
    [/photo|videograph|portrait|wedding film/,       "photography"],
    [/accounting|bookkeep|tax|cpa|financial advis/,  "accounting & finance"],
    [/consult|strategy|business coach|advisory/,     "consulting"],
    [/market|seo|social media|digital agency/,       "digital marketing"],
  ];

  for (const [pattern, label] of industries) {
    if (pattern.test(text)) return label;
  }
  return "local business";
}

async function generateRedesignCopy(data: ScrapedInput): Promise<RedesignCopy> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Solid fallback — still better than raw scraped copy
    return buildFallbackCopy(data);
  }

  const industry = inferIndustry(data);
  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a conversion copywriter for premium web design. You write copy that makes local businesses look credible, premium, and trustworthy. You know how to speak directly to the customer's pain and outcome.

Output strict JSON only. No markdown. No explanation. No wrapper text. Just the raw JSON object.`;

  const userPrompt = `Write premium conversion copy for this business's website redesign.

Business name: ${data.businessName}
Industry: ${industry}
Current description: ${data.description || "Not provided"}
Current headline: ${data.headline || "Not provided"}
Services found on site: ${data.services.length > 0 ? data.services.join(", ") : "Not found"}
Location: ${data.address || "Not specified"}

Rules:
- The headline must NOT be the business name — write a benefit-driven statement that speaks to the customer outcome
- The subhead expands on the headline in 1 sentence — specific to the industry, max 20 words
- Rewrite each service with a punchy title and a 1-sentence outcome-focused description
- The CTA should be specific (not "Contact Us" — something like "Book a Free Estimate" or "Get Your Quote Today")
- Write as if this is a $10,000 website for a business that takes pride in their work
- Sound human and confident, not corporate

Return this exact JSON structure:
{
  "headline": "A benefit-driven headline, 4-8 words, no business name",
  "subhead": "One supporting sentence, industry-specific, max 20 words",
  "services": [
    { "title": "Rewritten service title", "desc": "Outcome-focused one sentence description, max 15 words" }
  ],
  "cta": "3-5 word primary CTA (specific to industry)",
  "ctaSecondary": "3-5 word secondary CTA",
  "closingHeadline": "5-8 word closing section headline that makes them want to reach out"
}

Write exactly ${Math.max(data.services.length, 1)} service objects, one per service listed above.`;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Claude response");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      headline:       parsed.headline       || buildFallbackCopy(data).headline,
      subhead:        parsed.subhead        || buildFallbackCopy(data).subhead,
      services:       Array.isArray(parsed.services) && parsed.services.length > 0
                        ? parsed.services
                        : buildFallbackCopy(data).services,
      cta:            parsed.cta            || buildFallbackCopy(data).cta,
      ctaSecondary:   parsed.ctaSecondary   || "See Our Work",
      closingHeadline:parsed.closingHeadline|| buildFallbackCopy(data).closingHeadline,
    };
  } catch (err) {
    console.error("Claude redesign copy failed:", err);
    return buildFallbackCopy(data);
  }
}

function buildFallbackCopy(data: ScrapedInput): RedesignCopy {
  const industry = inferIndustry(data);

  const fallbacks: Record<string, RedesignCopy> = {
    "plumbing": {
      headline: "Fast Fixes. Zero Headaches.",
      subhead: "Licensed plumbers who show up on time and get it done right the first time.",
      services: data.services.map(s => ({ title: s, desc: "Professional, reliable service — done right the first time." })),
      cta: "Book a Free Estimate",
      ctaSecondary: "View Our Services",
      closingHeadline: "Got a leak? Let's fix it today.",
    },
    "roofing": {
      headline: "Built to Handle Whatever Comes.",
      subhead: "Quality roofing that protects your home for decades — installed by certified professionals.",
      services: data.services.map(s => ({ title: s, desc: "Installed with care, backed by our workmanship guarantee." })),
      cta: "Get a Free Roof Inspection",
      ctaSecondary: "See Past Projects",
      closingHeadline: "Your roof deserves better. Let's talk.",
    },
    "electrical": {
      headline: "Safe, Code-Compliant, Done Right.",
      subhead: "Licensed electricians handling residential and commercial work across the region.",
      services: data.services.map(s => ({ title: s, desc: "Safe, code-compliant electrical work you can count on." })),
      cta: "Request a Free Quote",
      ctaSecondary: "Our Services",
      closingHeadline: "Need an electrician? We're ready.",
    },
    "construction": {
      headline: "Built Stronger. Built to Last.",
      subhead: "Experienced contractors delivering quality builds on time and on budget.",
      services: data.services.map(s => ({ title: s, desc: "Delivered on time, on budget, and built to exceed expectations." })),
      cta: "Start Your Project",
      ctaSecondary: "View Our Work",
      closingHeadline: "Ready to build something great?",
    },
  };

  return fallbacks[industry] || {
    headline: "Where Quality Meets Reliability.",
    subhead: `${data.businessName} — trusted by local customers for years.`,
    services: data.services.map(s => ({ title: s, desc: "Professional service delivered with care and precision." })),
    cta: "Get a Free Quote",
    ctaSecondary: "Learn More",
    closingHeadline: "Ready to get started? Let's talk.",
  };
}

function buildPreviewHTML(data: ScrapedInput, copy: RedesignCopy): string {
  const primary   = data.colors[0] || "#00f5a0";
  const secondary = data.colors[1] || "#00d9f5";
  const r = parseInt(primary.slice(1,3),16);
  const g = parseInt(primary.slice(3,5),16);
  const b = parseInt(primary.slice(5,7),16);

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
.badge{position:relative;display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:100px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:36px;color:${primary};background:rgba(${r},${g},${b},.1);border:1px solid rgba(${r},${g},${b},.25)}
.dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
h1{position:relative;font-size:clamp(2.8rem,8vw,6.5rem);font-weight:900;line-height:1.02;letter-spacing:-.03em;margin-bottom:20px;color:#f0f0f0}
.subhead{position:relative;font-size:1.15rem;color:#888;max-width:560px;line-height:1.75;margin-bottom:48px}
.btns{position:relative;display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-p{padding:18px 40px;border-radius:14px;font-weight:800;font-size:1rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary});box-shadow:0 0 40px rgba(${r},${g},${b},.35);transition:.2s}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 0 60px rgba(${r},${g},${b},.55)}
.btn-s{padding:18px 40px;border-radius:14px;font-weight:700;font-size:1rem;text-decoration:none;color:#f0f0f0;background:#111;border:1px solid #2a2a2a;transition:.2s}
.btn-s:hover{border-color:${primary}}
.services{padding:96px 24px;background:#0a0a0a}
.inner{max-width:1100px;margin:0 auto}
.sec-label{font-family:monospace;font-size:.7rem;text-transform:uppercase;letter-spacing:.15em;color:${primary};margin-bottom:12px;display:block}
.sec-title{font-size:clamp(1.8rem,4vw,3rem);font-weight:900;color:#f0f0f0;margin-bottom:52px;line-height:1.1}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.card{padding:32px;border-radius:20px;background:#0d0d0d;border:1px solid #1c1c1c;transition:.3s;cursor:default}
.card:hover{border-color:rgba(${r},${g},${b},.35);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
.card-num{font-family:monospace;font-size:.7rem;color:${primary};margin-bottom:16px;letter-spacing:.08em}
.card-title{font-size:1.05rem;font-weight:700;color:#f0f0f0;margin-bottom:10px;line-height:1.3}
.card-desc{font-size:.875rem;color:#666;line-height:1.65}
.closing{padding:96px 24px;text-align:center;position:relative}
.closing::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(${r},${g},${b},.055) 0%,transparent 65%);pointer-events:none}
.closing h2{position:relative;font-size:clamp(1.8rem,4vw,3rem);font-weight:900;margin-bottom:16px}
.closing p{position:relative;color:#666;font-size:1rem;margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto}
.pills{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:36px;position:relative}
.pill{padding:10px 22px;border-radius:100px;background:#111;border:1px solid #222;color:#999;font-size:.875rem;display:flex;align-items:center;gap:8px}
.banner{position:fixed;bottom:0;left:0;right:0;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;z-index:999;background:rgba(6,6,6,.98);backdrop-filter:blur(24px);border-top:1px solid #1a1a1a}
.bt{font-size:.8rem;color:#777}.bt strong{color:#ddd}
.bc{padding:9px 20px;border-radius:8px;font-weight:700;font-size:.8rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary})}
footer{padding:28px 24px;text-align:center;border-top:1px solid #0f0f0f}
footer p{color:#3a3a3a;font-size:.75rem}
@media(max-width:640px){nav{padding:14px 20px}.banner{flex-direction:column;gap:10px;text-align:center}h1{font-size:clamp(2.2rem,10vw,4rem)}}
</style></head><body>

<nav>
  <div class="logo">${data.businessName}</div>
  <a href="#contact" class="nav-cta">${copy.cta}</a>
</nav>

<section class="hero">
  <div class="badge"><span class="dot"></span>Free Preview — Powered by RandyBuilds</div>
  <h1><span class="grad">${copy.headline}</span></h1>
  <p class="subhead">${copy.subhead}</p>
  <div class="btns">
    <a href="#contact" class="btn-p">${copy.cta} →</a>
    <a href="#services" class="btn-s">${copy.ctaSecondary}</a>
  </div>
</section>

${copy.services.length ? `
<section class="services" id="services">
  <div class="inner">
    <span class="sec-label">What We Do</span>
    <h2 class="sec-title">Built <span class="grad">for results.</span></h2>
    <div class="grid">
      ${copy.services.map((s, i) => `
      <div class="card">
        <div class="card-num">${String(i+1).padStart(2,"0")}</div>
        <div class="card-title">${s.title}</div>
        <div class="card-desc">${s.desc}</div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<section class="closing" id="contact">
  <h2><span class="grad">${copy.closingHeadline}</span></h2>
  <p>Reach out today and let's get to work.</p>
  ${(data.phone || data.email) ? `<div class="pills">
    ${data.phone ? `<div class="pill">📞 ${data.phone}</div>` : ""}
    ${data.email ? `<div class="pill">✉️ ${data.email}</div>` : ""}
  </div>` : ""}
  <a href="mailto:${data.email || "hello@" + new URL(data.url).hostname}" class="btn-p">${copy.cta} →</a>
</section>

<footer>
  <p>${data.businessName} — redesign preview by <strong>RandyBuilds</strong></p>
</footer>

<div class="banner">
  <div class="bt">👀 <strong>Free preview.</strong> This is what your site could look like — built by RandyBuilds.</div>
  <a href="/" class="bc">Buy This Site →</a>
</div>

</body></html>`;
}

// Shared preview store — imported by /preview/[slug] route
export const previewStore = new Map<string, {
  html: string;
  businessName: string;
  createdAt: number;
}>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept either raw scraped data OR a URL (will do a quick fetch for metadata)
    const data: ScrapedInput = body.scraped ?? body;

    if (!data.businessName || !data.url) {
      return NextResponse.json({ error: "businessName and url are required" }, { status: 400 });
    }

    // Generate copy — this is the $2,500 moment
    const copy = await generateRedesignCopy(data);
    const html = buildPreviewHTML(data, copy);

    const slug = data.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);

    previewStore.set(slug, {
      html,
      businessName: data.businessName,
      createdAt: Date.now(),
    });

    // Keep store lean
    if (previewStore.size > 200) {
      const oldest = [...previewStore.entries()]
        .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      previewStore.delete(oldest[0]);
    }

    return NextResponse.json({
      previewUrl: `/preview/${slug}`,
      previewHtml: html,
      businessName: data.businessName,
      slug,
      copy,
      aiPowered: !!process.env.ANTHROPIC_API_KEY,
    });
  } catch (err) {
    console.error("/api/redesign error:", err);
    return NextResponse.json({ error: "Redesign generation failed" }, { status: 500 });
  }
}
