import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const maxDuration = 30;

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

  // Extract business name
  const businessName =
    $('meta[property="og:site_name"]').attr("content") ||
    $("title").text().split(/[-|•]/)[0].trim() ||
    new URL(url).hostname.replace("www.", "").split(".")[0];

  // Extract description
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $("p").first().text().slice(0, 200) ||
    "";

  // Extract headline
  const headline =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    businessName;

  // Extract colors from inline styles and CSS
  const colorMatches: string[] = [];
  const styleContent = $("style").text() + $("[style]").map((_, el) => $(el).attr("style")).get().join(" ");
  const hexMatches = styleContent.match(/#[0-9a-fA-F]{6}\b/g) || [];
  const rgbMatches = styleContent.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];
  
  // Convert RGB to hex
  rgbMatches.forEach(rgb => {
    const nums = rgb.match(/\d+/g);
    if (nums && nums.length >= 3) {
      const hex = "#" + nums.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
      colorMatches.push(hex);
    }
  });
  
  colorMatches.push(...hexMatches);
  
  // Filter and deduplicate colors
  const uniqueColors = [...new Set(colorMatches)]
    .filter(c => c !== "#000000" && c !== "#ffffff" && c !== "#000" && c !== "#fff")
    .slice(0, 5);

  if (uniqueColors.length < 2) {
    uniqueColors.push("#1a1a2e", "#e94560");
  }

  // Extract logo
  let logoUrl: string | null = null;
  const logoSelectors = ['img[src*="logo"]', 'img[alt*="logo" i]', 'img[class*="logo" i]', 'header img'];
  for (const sel of logoSelectors) {
    const src = $(sel).first().attr("src");
    if (src) {
      logoUrl = src.startsWith("http") ? src : new URL(src, url).href;
      break;
    }
  }

  // Extract contact info
  const pageText = $("body").text();
  const phoneMatch = pageText.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  
  // Extract address
  const addressMatch = pageText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Way|Blvd|Boulevard)[.,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}/);

  // Extract services/features
  const services: string[] = [];
  $("h2, h3, li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 60 && services.length < 8) {
      services.push(text);
    }
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

function generatePreviewSlug(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
}

function generatePremiumHTML(data: ScrapeResult): string {
  const primary = data.colors[0] || "#00f5a0";
  const secondary = data.colors[1] || "#00d9f5";
  const name = data.businessName;
  const desc = data.description || `Premium services from ${name}`;
  const services = data.services.slice(0, 6);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} — Premium Redesign Preview</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#080808;color:#f0f0f0;overflow-x:hidden}
.gradient-text{background:linear-gradient(135deg,${primary},${secondary});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:20px 48px;background:rgba(8,8,8,0.9);backdrop-filter:blur(20px);border-bottom:1px solid #151515}
.logo{font-weight:900;font-size:1.4rem;letter-spacing:-0.02em}
.nav-cta{padding:10px 24px;border-radius:8px;font-weight:700;font-size:.85rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary});transition:transform .2s}
.nav-cta:hover{transform:scale(1.04)}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 24px 80px;position:relative;background-image:linear-gradient(rgba(0,245,160,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,160,0.025) 1px,transparent 1px);background-size:50px 50px}
.hero::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 30%,rgba(${parseInt(primary.slice(1,3),16)},${parseInt(primary.slice(3,5),16)},${parseInt(primary.slice(5,7),16)},0.08) 0%,transparent 70%);pointer-events:none}
.badge{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:100px;font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:32px;color:${primary};background:rgba(${parseInt(primary.slice(1,3),16)},${parseInt(primary.slice(3,5),16)},${parseInt(primary.slice(5,7),16)},0.1);border:1px solid rgba(${parseInt(primary.slice(1,3),16)},${parseInt(primary.slice(3,5),16)},${parseInt(primary.slice(5,7),16)},0.2)}
.badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:clamp(3rem,8vw,6.5rem);font-weight:900;line-height:1;letter-spacing:-.03em;margin-bottom:24px;color:#f0f0f0}
.hero-sub{font-size:1.2rem;color:#777;max-width:600px;line-height:1.7;margin-bottom:48px}
.cta-group{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.btn-primary{padding:18px 40px;border-radius:14px;font-weight:800;font-size:1rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary});display:inline-flex;align-items:center;gap:10px;transition:transform .2s,box-shadow .2s;box-shadow:0 0 30px rgba(${parseInt(primary.slice(1,3),16)},${parseInt(primary.slice(3,5),16)},${parseInt(primary.slice(5,7),16)},0.3)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 0 50px rgba(${parseInt(primary.slice(1,3),16)},${parseInt(primary.slice(3,5),16)},${parseInt(primary.slice(5,7),16)},0.5)}
.btn-secondary{padding:18px 40px;border-radius:14px;font-weight:700;font-size:1rem;text-decoration:none;color:#f0f0f0;background:#111;border:1px solid #333;transition:border-color .2s}
.btn-secondary:hover{border-color:${primary}}
.services{padding:100px 24px;background:#0a0a0a}
.services-inner{max-width:1100px;margin:0 auto}
.section-label{font-family:monospace;font-size:.7rem;text-transform:uppercase;letter-spacing:.15em;color:${primary};margin-bottom:16px;display:block}
.section-title{font-size:clamp(2rem,5vw,3.5rem);font-weight:900;color:#f0f0f0;margin-bottom:60px;line-height:1.1}
.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.service-card{padding:32px;border-radius:20px;background:#0e0e0e;border:1px solid #1a1a1a;transition:border-color .3s,transform .3s}
.service-card:hover{border-color:${primary}40;transform:translateY(-4px)}
.service-num{font-family:monospace;font-size:.75rem;color:${primary};margin-bottom:16px}
.service-title{font-size:1.1rem;font-weight:700;color:#f0f0f0;margin-bottom:10px}
.service-desc{font-size:.9rem;color:#666;line-height:1.6}
.contact{padding:80px 24px;text-align:center}
.contact-inner{max-width:700px;margin:0 auto}
.contact h2{font-size:clamp(2rem,5vw,3.5rem);font-weight:900;margin-bottom:20px}
.contact p{color:#666;font-size:1.1rem;margin-bottom:40px}
.contact-info{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:40px}
.contact-pill{padding:12px 24px;border-radius:100px;background:#111;border:1px solid #222;color:#aaa;font-size:.9rem;display:flex;align-items:center;gap:8px}
.preview-banner{position:fixed;bottom:0;left:0;right:0;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;z-index:1000;background:rgba(8,8,8,0.95);backdrop-filter:blur(20px);border-top:1px solid #1a1a1a}
.preview-text{font-size:.85rem;color:#888}
.preview-text strong{color:#f0f0f0}
.preview-cta{padding:10px 24px;border-radius:8px;font-weight:700;font-size:.85rem;text-decoration:none;color:#000;background:linear-gradient(135deg,${primary},${secondary})}
footer{padding:40px 24px;text-align:center;border-top:1px solid #111;background:#080808}
footer p{color:#444;font-size:.85rem}
@media(max-width:768px){nav{padding:16px 24px}.preview-banner{flex-direction:column;gap:12px;text-align:center}}
</style>
</head>
<body>
<nav>
  <div class="logo">${name}</div>
  <a href="#contact" class="nav-cta">Get In Touch</a>
</nav>

<section class="hero">
  <div class="badge"><span class="badge-dot"></span>Premium Redesign Preview</div>
  <h1><span class="gradient-text">${name}</span><br>Done Right.</h1>
  <p class="hero-sub">${desc}</p>
  <div class="cta-group">
    <a href="#contact" class="btn-primary">Get Started →</a>
    <a href="#services" class="btn-secondary">Our Services</a>
  </div>
</section>

${services.length > 0 ? `
<section class="services" id="services">
  <div class="services-inner">
    <span class="section-label">What We Do</span>
    <h2 class="section-title">Services built<br><span class="gradient-text">for results.</span></h2>
    <div class="services-grid">
      ${services.map((s, i) => `
      <div class="service-card">
        <div class="service-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="service-title">${s}</div>
        <div class="service-desc">Professional, reliable, and delivered with precision. We take pride in every project.</div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<section class="contact" id="contact">
  <div class="contact-inner">
    <h2 class="gradient-text">Ready to work<br>together?</h2>
    <p>We'd love to hear about your project. Get in touch and let's build something great.</p>
    <div class="contact-info">
      ${data.phone ? `<div class="contact-pill">📞 ${data.phone}</div>` : ""}
      ${data.email ? `<div class="contact-pill">✉️ ${data.email}</div>` : ""}
      ${data.address ? `<div class="contact-pill">📍 ${data.address}</div>` : ""}
    </div>
    <a href="mailto:${data.email || "info@" + new URL(data.url).hostname}" class="btn-primary">Send Us a Message</a>
  </div>
</section>

<footer>
  <p>${name} — Premium Redesign Preview by <strong>RandyBuilds</strong> • Built different.</p>
</footer>

<div class="preview-banner">
  <div class="preview-text">👀 You're viewing a <strong>free preview</strong> of what your new site could look like.</div>
  <a href="/" class="preview-cta">Buy This Design →</a>
</div>
</body>
</html>`;
}

// In-memory preview store (replace with Supabase in production)
const previewStore = new Map<string, { html: string; businessName: string; createdAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
    } catch {
      return NextResponse.json({ error: "Please enter a valid website URL" }, { status: 400 });
    }

    // Scrape the website
    let scraped: ScrapeResult;
    try {
      scraped = await scrapeWebsite(parsedUrl.href);
    } catch (err) {
      console.error("Scrape error:", err);
      // Fallback with minimal data
      scraped = {
        businessName: parsedUrl.hostname.replace("www.", "").split(".")[0],
        description: "A local business ready for a premium online presence.",
        colors: ["#6366f1", "#8b5cf6"],
        logoUrl: null,
        phone: null,
        email: null,
        address: null,
        services: ["Professional Services", "Quality Work", "Customer First"],
        headline: "Welcome",
        rawHtml: "",
        url: parsedUrl.href,
      };
    }

    // Generate premium HTML
    const previewHtml = generatePremiumHTML(scraped);
    const slug = generatePreviewSlug(scraped.businessName);

    // Store preview (in production: Supabase storage)
    previewStore.set(slug, {
      html: previewHtml,
      businessName: scraped.businessName,
      createdAt: Date.now(),
    });

    // Clean old previews (keep last 100)
    if (previewStore.size > 100) {
      const oldest = [...previewStore.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      previewStore.delete(oldest[0]);
    }

    const previewUrl = `/preview/${slug}`;

    return NextResponse.json({
      previewUrl,
      businessName: scraped.businessName,
      slug,
      scraped: {
        colors: scraped.colors,
        phone: scraped.phone,
        email: scraped.email,
        services: scraped.services,
      },
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to analyze website. Please try again." }, { status: 500 });
  }
}

// Export store for preview route to use
export { previewStore };
