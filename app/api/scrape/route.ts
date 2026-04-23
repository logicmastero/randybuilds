import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 45;

interface ScrapeResult {
  businessName: string;
  description: string;
  colors: string[];
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  services: string[];
  headline: string;
  rawHtml: string;
  url: string;
}

interface AICopy {
  headline: string;
  subheadline: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  serviceDescriptions: string[];
  closingTagline: string;
}

async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);

  const businessName =
    $('meta[property="og:site_name"]').attr("content") ||
    $("title").text().split(/[-|•]/)[0].trim() ||
    new URL(url).hostname.replace("www.", "").split(".")[0];

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $("p").first().text().slice(0, 200) || "";

  const headline =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    businessName;

  const colorMatches: string[] = [];
  const styleContent = $("style").text() + $("[style]").map((_, el) => $(el).attr("style")).get().join(" ");
  const hexMatches = styleContent.match(/#[0-9a-fA-F]{6}\b/g) || [];
  const rgbMatches = styleContent.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];
  rgbMatches.forEach(rgb => {
    const nums = rgb.match(/\d+/g);
    if (nums && nums.length >= 3) {
      colorMatches.push("#" + nums.slice(0,3).map(n => parseInt(n).toString(16).padStart(2,"0")).join(""));
    }
  });
  colorMatches.push(...hexMatches);
  const uniqueColors = [...new Set(colorMatches)]
    .filter(c => c !== "#000000" && c !== "#ffffff" && c !== "#000" && c !== "#fff")
    .slice(0, 5);
  if (uniqueColors.length < 2) uniqueColors.push("#1a1a2e", "#e94560");

  let logoUrl: string | null = null;
  for (const sel of ['img[src*="logo"]', 'img[alt*="logo" i]', 'img[class*="logo" i]', 'header img']) {
    const src = $(sel).first().attr("src");
    if (src) { logoUrl = src.startsWith("http") ? src : new URL(src, url).href; break; }
  }

  const pageText = $("body").text();
  const phoneMatch = pageText.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const addressMatch = pageText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Way|Blvd|Boulevard)[.,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}/);

  const services: string[] = [];
  $("h2, h3, li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 60 && services.length < 8) services.push(text);
  });

  return {
    businessName: businessName.trim(),
    description: description.trim(),
    colors: uniqueColors.length > 0 ? uniqueColors : ["#1a1a2e", "#e94560"],
    logoUrl,
    phone: phoneMatch ? phoneMatch[1].trim() : null,
    email: emailMatch ? emailMatch[0] : null,
    address: addressMatch ? addressMatch[0].trim() : null,
    services: services.slice(0, 6),
    headline: headline.trim(),
    rawHtml: html.slice(0, 5000),
    url,
  };
}

async function generateAICopy(scraped: ScrapeResult): Promise<AICopy> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  // Fallback copy if no API key
  if (!apiKey) {
    return {
      headline: scraped.businessName,
      subheadline: "Done Right.",
      heroSub: scraped.description || `Professional services from ${scraped.businessName}. Built for results, built to last.`,
      ctaPrimary: "Get Started Today",
      ctaSecondary: "See Our Work",
      serviceDescriptions: scraped.services.map(() => "Delivered with precision and professionalism on every project."),
      closingTagline: "Ready to work together?",
    };
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a world-class conversion copywriter. A business has a mediocre website and you're writing premium copy for their redesign preview.

Business details scraped from their current site:
- Name: ${scraped.businessName}
- Current description: ${scraped.description || "None found"}
- Current headline: ${scraped.headline || "None found"}  
- Services/offerings found: ${scraped.services.join(", ") || "None found"}
- Location hint: ${scraped.address || "Not found"}
- Contact: ${scraped.phone || scraped.email || "Not found"}

Write copy that makes their business look premium and credible. Be specific to their industry. No generic filler.

Return ONLY a JSON object with these exact keys:
{
  "headline": "The business name (keep it, don't change it)",
  "subheadline": "A punchy 2-4 word statement. Examples: 'Done Right.', 'Built to Last.', 'Your Local Experts.'",
  "heroSub": "1-2 sentence hero subheadline. Specific to their industry. Max 25 words. Focus on the customer outcome.",
  "ctaPrimary": "3-5 word primary CTA button text",
  "ctaSecondary": "3-5 word secondary CTA button text",
  "serviceDescriptions": [${scraped.services.map(() => '"One sentence description for this service, max 15 words"').join(", ")}],
  "closingTagline": "Short closing section headline, 4-8 words, makes them want to reach out"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      headline: parsed.headline || scraped.businessName,
      subheadline: parsed.subheadline || "Done Right.",
      heroSub: parsed.heroSub || scraped.description,
      ctaPrimary: parsed.ctaPrimary || "Get Started Today",
      ctaSecondary: parsed.ctaSecondary || "See Our Work",
      serviceDescriptions: Array.isArray(parsed.serviceDescriptions) ? parsed.serviceDescriptions : scraped.services.map(() => "Professional service delivered with care."),
      closingTagline: parsed.closingTagline || "Ready to work together?",
    };
  } catch (err) {
    console.error("Claude copy generation failed:", err);
    return {
      headline: scraped.businessName,
      subheadline: "Done Right.",
      heroSub: scraped.description || `${scraped.businessName} — professional, reliable, results-driven.`,
      ctaPrimary: "Get Started Today",
      ctaSecondary: "See Our Work",
      serviceDescriptions: scraped.services.map(() => "Delivered with precision and professionalism."),
      closingTagline: "Ready to work together?",
    };
  }
}

function generatePremiumHTML(data: ScrapeResult, copy: AICopy): string {
  const primary = data.colors[0] || "#00f5a0";
  const secondary = data.colors[1] || "#00d9f5";
  const r = parseInt(primary.slice(1,3),16);
  const g = parseInt(primary.slice(3,5),16);
  const b = parseInt(primary.slice(5,7),16);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${data.businessName} — Premium Redesign Preview by RandyBuilds</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#080808;color:#f0f0f0;overflow-x:hidden}
.grad{background:linear-gradient(135deg,${primary},${secondary});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:20px 48px;background:rgba(8,8,8,.92);backdrop-filter:blur(20px);border-bottom:1px solid #151515}
.logo{font-weight:900;font-size:1.4rem;letter-spacing:-.02em}
.nav-cta{padding:10px 24px;border-radius:8px;font-weight:700;font-size:.85rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary})}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 100px;background-image:linear-gradient(rgba(${r},${g},${b},.025) 1px,transparent 1px),linear-gradient(90deg,rgba(${r},${g},${b},.025) 1px,transparent 1px);background-size:50px 50px;position:relative}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(${r},${g},${b},.08) 0%,transparent 70%);pointer-events:none}
.badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:100px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:32px;color:${primary};background:rgba(${r},${g},${b},.1);border:1px solid rgba(${r},${g},${b},.2)}
.dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:p 2s infinite}
@keyframes p{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:clamp(3rem,8vw,6.5rem);font-weight:900;line-height:1;letter-spacing:-.03em;margin-bottom:12px;color:#f0f0f0}
.sub2{font-size:clamp(1.8rem,4vw,3.5rem);font-weight:900;margin-bottom:28px}
.sub{font-size:1.15rem;color:#777;max-width:580px;line-height:1.7;margin-bottom:48px}
.btns{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-p{padding:18px 40px;border-radius:14px;font-weight:800;font-size:1rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary});box-shadow:0 0 30px rgba(${r},${g},${b},.3);transition:.2s}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 0 50px rgba(${r},${g},${b},.5)}
.btn-s{padding:18px 40px;border-radius:14px;font-weight:700;font-size:1rem;text-decoration:none;color:#f0f0f0;background:#111;border:1px solid #333;transition:.2s}
.btn-s:hover{border-color:${primary}}
.services{padding:100px 24px;background:#0a0a0a}
.inner{max-width:1100px;margin:0 auto}
.label{font-family:monospace;font-size:.7rem;text-transform:uppercase;letter-spacing:.15em;color:${primary};margin-bottom:16px;display:block}
.stitle{font-size:clamp(2rem,4vw,3rem);font-weight:900;color:#f0f0f0;margin-bottom:56px;line-height:1.1}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.card{padding:32px;border-radius:20px;background:#0e0e0e;border:1px solid #1a1a1a;transition:.3s}
.card:hover{border-color:rgba(${r},${g},${b},.3);transform:translateY(-4px)}
.num{font-family:monospace;font-size:.75rem;color:${primary};margin-bottom:14px}
.ctitle{font-size:1.05rem;font-weight:700;color:#f0f0f0;margin-bottom:10px}
.cdesc{font-size:.9rem;color:#666;line-height:1.6}
.closing{padding:100px 24px;text-align:center;position:relative}
.closing::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50%,rgba(${r},${g},${b},.05) 0%,transparent 70%);pointer-events:none}
.closing h2{font-size:clamp(2rem,5vw,3.5rem);font-weight:900;margin-bottom:16px}
.closing p{color:#666;font-size:1.1rem;margin-bottom:40px}
${data.phone || data.email ? `.pills{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.pill{padding:12px 24px;border-radius:100px;background:#111;border:1px solid #222;color:#aaa;font-size:.9rem;display:flex;align-items:center;gap:8px}` : ""}
.banner{position:fixed;bottom:0;left:0;right:0;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;z-index:1000;background:rgba(8,8,8,.97);backdrop-filter:blur(20px);border-top:1px solid #1a1a1a}
.bt{font-size:.85rem;color:#888}.bt strong{color:#f0f0f0}
.bc{padding:10px 22px;border-radius:8px;font-weight:700;font-size:.85rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary})}
footer{padding:36px 24px;text-align:center;border-top:1px solid #111}
footer p{color:#444;font-size:.8rem}
@media(max-width:768px){nav{padding:16px 24px}.banner{flex-direction:column;gap:10px;text-align:center}}
</style></head><body>
<nav>
  <div class="logo">${data.businessName}</div>
  <a href="#contact" class="nav-cta">Get In Touch</a>
</nav>

<section class="hero">
  <div class="badge"><span class="dot"></span>Premium Redesign Preview</div>
  <h1 class="grad">${copy.headline}</h1>
  <div class="sub2">${copy.subheadline}</div>
  <p class="sub">${copy.heroSub}</p>
  <div class="btns">
    <a href="#contact" class="btn-p">${copy.ctaPrimary} →</a>
    <a href="#services" class="btn-s">${copy.ctaSecondary}</a>
  </div>
</section>

${data.services.length ? `
<section class="services" id="services">
  <div class="inner">
    <span class="label">What We Do</span>
    <h2 class="stitle">Built <span class="grad">for results.</span></h2>
    <div class="grid">
      ${data.services.map((s, i) => `
      <div class="card">
        <div class="num">${String(i+1).padStart(2,"0")}</div>
        <div class="ctitle">${s}</div>
        <div class="cdesc">${copy.serviceDescriptions[i] || "Professional service delivered with precision."}</div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<section class="closing" id="contact">
  <h2 class="grad">${copy.closingTagline}</h2>
  <p>Let's build something great together. Reach out and we'll get started.</p>
  ${data.phone || data.email ? `<div class="pills">
    ${data.phone ? `<div class="pill">📞 ${data.phone}</div>` : ""}
    ${data.email ? `<div class="pill">✉️ ${data.email}</div>` : ""}
  </div>` : ""}
  <a href="mailto:${data.email || "hello@" + new URL(data.url).hostname}" class="btn-p">${copy.ctaPrimary} →</a>
</section>

<footer>
  <p>${data.businessName} — Premium redesign preview by <strong>RandyBuilds</strong> • builtdifferent.ca</p>
</footer>

<div class="banner">
  <div class="bt">👀 <strong>Free preview</strong> — this is what your site could look like.</div>
  <a href="/" class="bc">Buy This Design →</a>
</div>
</body></html>`;
}

export const previewStore = new Map<string, { html: string; businessName: string; createdAt: number }>();

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") + "-" + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let parsed: URL;
    try {
      parsed = new URL(url.startsWith("http") ? url : "https://" + url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    let scraped: ScrapeResult;
    try {
      scraped = await scrapeWebsite(parsed.href);
    } catch {
      scraped = {
        businessName: parsed.hostname.replace("www.","").split(".")[0],
        description: "A local business ready for a premium online presence.",
        colors: ["#6366f1","#8b5cf6"],
        logoUrl: null, phone: null, email: null, address: null,
        services: ["Our Services","Quality Work","Customer Care"],
        headline: "Welcome", rawHtml: "", url: parsed.href,
      };
    }

    // Generate AI copy + HTML in parallel with slug creation
    const [copy] = await Promise.all([generateAICopy(scraped)]);
    const html = generatePremiumHTML(scraped, copy);
    const slug = generateSlug(scraped.businessName);

    previewStore.set(slug, { html, businessName: scraped.businessName, createdAt: Date.now() });
    if (previewStore.size > 100) {
      const oldest = [...previewStore.entries()].sort((a,b) => a[1].createdAt - b[1].createdAt)[0];
      previewStore.delete(oldest[0]);
    }

    return NextResponse.json({
      previewUrl: `/preview/${slug}`,
      businessName: scraped.businessName,
      slug,
      aiPowered: !!process.env.ANTHROPIC_API_KEY,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
  }
}
