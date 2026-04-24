import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 55;

export interface ScrapeResult {
  businessName: string;
  description: string;
  colors: string[];
  logoUrl: string | null;
  images: string[];
  phone: string | null;
  email: string | null;
  address: string | null;
  services: string[];
  headline: string;
  url: string;
}

// ── Firecrawl scraper ─────────────────────────────────────────────────────────
async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const FC_KEY = process.env.FIRECRAWL_API_KEY;
  if (!FC_KEY) throw new Error("FIRECRAWL_API_KEY not set");

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FC_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "screenshot@fullPage"],
      onlyMainContent: false,
      waitFor: 2000,
      actions: [],
    }),
    signal: AbortSignal.timeout(40000),
  });

  if (!res.ok) throw new Error(`Firecrawl error: ${res.status}`);
  const data = await res.json();

  const md: string = data.data?.markdown || "";
  const meta = data.data?.metadata || {};
  const screenshotUrl: string | null = data.data?.screenshot || null;

  // ── Business name ──────────────────────────────────────────────────────────
  const businessName =
    meta.ogSiteName ||
    (meta.title || "").split(/[-|•|/]/)[0].trim() ||
    new URL(url).hostname.replace("www.", "").split(".")[0];

  // ── Description ───────────────────────────────────────────────────────────
  const description =
    meta.description ||
    meta.ogDescription ||
    extractFirstParagraph(md) ||
    "A local business ready for a premium online presence.";

  // ── Headline ──────────────────────────────────────────────────────────────
  const h1Match = md.match(/^#\s+(.+)$/m);
  const headline =
    h1Match?.[1]?.trim() ||
    meta.ogTitle ||
    businessName;

  // ── Services — extract from markdown headings ──────────────────────────────
  const services = extractServices(md);

  // ── Images — og:image + any markdown images ────────────────────────────────
  const images: string[] = [];
  if (meta.ogImage) images.push(meta.ogImage);
  // Extract markdown image URLs: ![alt](url)
  const imgRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = imgRegex.exec(md)) !== null && images.length < 12) {
    const src = m[1];
    if (!SKIP_PATTERNS.test(src) && !images.includes(src)) images.push(src);
  }
  // Screenshot as fallback hero image
  if (screenshotUrl && images.length === 0) images.push(screenshotUrl);

  // ── Contact ───────────────────────────────────────────────────────────────
  const phoneMatch = md.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const emailMatch = md.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const addressMatch = md.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Way|Blvd)[.,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}/);

  // ── Colors — pull from theme-color meta or use brand-appropriate defaults ──
  const themeColor = meta.themeColor || null;
  const colors: string[] = themeColor ? [themeColor, darken(themeColor)] : ["#1a1a2e", "#e94560"];

  return {
    businessName: businessName.trim(),
    description: description.trim().slice(0, 300),
    colors,
    logoUrl: meta.ogImage || null,
    images: images.slice(0, 12),
    phone: phoneMatch ? phoneMatch[1].trim() : null,
    email: emailMatch ? emailMatch[0] : null,
    address: addressMatch ? addressMatch[0].trim() : null,
    services: services.slice(0, 6),
    headline: headline.trim(),
    url,
  };
}

const SKIP_PATTERNS = /favicon|icon|pixel|tracker|1x1|badge|arrow|chevron|spinner|loader|star|rating|avatar|profile|flag|sprite|placeholder/i;

const SERVICE_BLACKLIST = new Set([
  "facebook","instagram","twitter","youtube","linkedin","tiktok","pinterest","yelp","google",
  "home","about","contact","menu","blog","news","login","sign in","sign up","register",
  "privacy policy","terms","sitemap","careers","jobs","faq","search","click here","read more",
  "learn more","get started","book now","call now","email us","follow us","share","like",
  "subscribe","newsletter","copyright","all rights reserved","powered by",
]);

function extractServices(md: string): string[] {
  const services: string[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const h = line.match(/^#{1,3}\s+(.+)$/);
    if (h) {
      const text = h[1].trim().replace(/\*+/g, "");
      const lower = text.toLowerCase();
      const bad = [...SERVICE_BLACKLIST].some(b => lower.includes(b));
      if (!bad && text.length > 3 && text.length < 60 && services.length < 6) {
        services.push(text);
      }
    }
  }
  // Fallback: list items
  if (services.length < 2) {
    for (const line of lines) {
      const li = line.match(/^[-*]\s+(.+)$/);
      if (li) {
        const text = li[1].trim();
        const lower = text.toLowerCase();
        const bad = [...SERVICE_BLACKLIST].some(b => lower.includes(b));
        if (!bad && text.length > 4 && text.length < 50 && services.length < 6) {
          services.push(text);
        }
      }
    }
  }
  return services;
}

function extractFirstParagraph(md: string): string {
  const lines = md.split("\n").filter(l => l.trim() && !l.startsWith("#") && !l.startsWith("!") && !l.startsWith("["));
  return lines[0]?.slice(0, 250) || "";
}

function darken(hex: string): string {
  try {
    const n = parseInt(hex.replace("#",""), 16);
    const r = Math.max(0, (n >> 16) - 60);
    const g = Math.max(0, ((n >> 8) & 0xff) - 60);
    const b = Math.max(0, (n & 0xff) - 60);
    return "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");
  } catch { return "#0a0a20"; }
}

// ── Fallback cheerio scraper (if Firecrawl fails) ─────────────────────────────
async function scrapeWebsiteFallback(url: string): Promise<ScrapeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let html = "";
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
    });
    html = await res.text();
  } finally { clearTimeout(timeout); }

  // Minimal parse without cheerio (not available in edge)
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const phoneMatch = html.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

  const businessName = (titleMatch?.[1] || "").split(/[-|•]/)[0].trim() ||
    new URL(url).hostname.replace("www.","").split(".")[0];

  return {
    businessName,
    description: descMatch?.[1] || "A local business ready for a premium online presence.",
    colors: ["#1a1a2e","#e94560"],
    logoUrl: null,
    images: [],
    phone: phoneMatch?.[1]?.trim() || null,
    email: emailMatch?.[0] || null,
    address: null,
    services: ["Our Services","Quality Work","Customer Care","Fast Response","Local Experts","Free Estimates"],
    headline: h1Match?.[1]?.trim() || businessName,
    url,
  };
}

// ── Known-brand enrichment ────────────────────────────────────────────────────
interface BrandSeed { businessName:string; description:string; headline:string; services:string[]; colors:string[]; }
const KNOWN_BRANDS: { pattern: RegExp; seed: BrandSeed }[] = [
  { pattern: /stripe\.com/, seed: { businessName:"Stripe", description:"Stripe powers online and in-person payment processing and financial solutions for businesses of all sizes.", headline:"Financial infrastructure for the internet", services:["Payments","Billing & Subscriptions","Stripe Connect","Radar Fraud Detection","Stripe Terminal","Stripe Atlas"], colors:["#635bff","#0a2540"] } },
  { pattern: /shopify\.com/, seed: { businessName:"Shopify", description:"Build your business with Shopify — sell online, in-person, and everywhere in between.", headline:"Start selling with Shopify", services:["Online Store","Point of Sale","Shopify Payments","Shopify Plus","Marketing & SEO","Analytics & Reports"], colors:["#96bf48","#004c3f"] } },
  { pattern: /github\.com/, seed: { businessName:"GitHub", description:"GitHub is where the world builds software.", headline:"Where the world builds software", services:["Code Repositories","GitHub Actions CI/CD","GitHub Copilot","Code Review","GitHub Pages","Security Scanning"], colors:["#24292f","#0969da"] } },
];
function enrichKnownBrand(scraped: ScrapeResult, href: string): ScrapeResult {
  for (const { pattern, seed } of KNOWN_BRANDS) {
    if (pattern.test(href)) return { ...scraped, ...seed };
  }
  return scraped;
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let parsed: URL;
    try { parsed = new URL(url.startsWith("http") ? url : "https://" + url); }
    catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

    let scraped: ScrapeResult;
    try {
      scraped = await scrapeWebsite(parsed.href);
      console.log(`[scrape:firecrawl] ${parsed.hostname} → name="${scraped.businessName}" imgs=${scraped.images.length} svcs=${scraped.services.length}`);
    } catch (fcErr) {
      console.warn(`[scrape] Firecrawl failed, falling back to cheerio: ${fcErr}`);
      try {
        scraped = await scrapeWebsiteFallback(parsed.href);
        console.log(`[scrape:fallback] ${parsed.hostname} → name="${scraped.businessName}"`);
      } catch {
        scraped = {
          businessName: parsed.hostname.replace("www.","").split(".")[0],
          description: "A local business ready for a premium online presence.",
          colors: ["#6366f1","#8b5cf6"], logoUrl: null, images: [],
          phone: null, email: null, address: null,
          services: ["Our Services","Quality Work","Customer Care"],
          headline: "Welcome", url: parsed.href,
        };
      }
    }

    scraped = enrichKnownBrand(scraped, parsed.href);

    const { POST: redesignHandler } = await import("../redesign/route");
    const redesignReq = new Request("http://localhost/api/redesign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scraped }),
    });
    const redesignRes = await redesignHandler(new NextRequest(redesignReq));
    const redesignData = await redesignRes.json();

    return NextResponse.json({
      ...redesignData,
      previewHtml: redesignData.previewHtml ?? null,
      scraped: {
        colors: scraped.colors,
        phone: scraped.phone,
        email: scraped.email,
        services: scraped.services,
        images: scraped.images,
      },
    });
  } catch (err) {
    console.error("/api/scrape error:", err);
    return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
  }
}
