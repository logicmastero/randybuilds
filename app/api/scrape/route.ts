import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const maxDuration = 45;

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

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
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

  // ── Colors ─────────────────────────────────────────────────────────────────
  const colorMatches: string[] = [];
  const styleContent = $("style").text() + $("[style]").map((_, el) => $(el).attr("style")).get().join(" ");
  const hexMatches = styleContent.match(/#[0-9a-fA-F]{6}\b/g) || [];
  const rgbMatches = styleContent.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];
  rgbMatches.forEach(rgb => {
    const nums = rgb.match(/\d+/g);
    if (nums && nums.length >= 3)
      colorMatches.push("#" + nums.slice(0,3).map(n => parseInt(n).toString(16).padStart(2,"0")).join(""));
  });
  colorMatches.push(...hexMatches);
  const uniqueColors = [...new Set(colorMatches)]
    .filter(c => !["#000000","#ffffff","#000","#fff"].includes(c))
    .slice(0, 5);
  if (uniqueColors.length < 2) uniqueColors.push("#1a1a2e", "#e94560");

  // ── Logo ───────────────────────────────────────────────────────────────────
  let logoUrl: string | null = null;
  for (const sel of [
    'img[src*="logo"]',
    'img[alt*="logo" i]',
    'img[class*="logo" i]',
    'header img',
    'nav img',
    '.header img',
    '.navbar img',
  ]) {
    const src = $(sel).first().attr("src");
    if (src && !src.includes("data:")) {
      logoUrl = src.startsWith("http") ? src : new URL(src, url).href;
      break;
    }
  }
  // Also check og:image as logo fallback if it looks like a logo/icon (small dimensions hint)
  if (!logoUrl) {
    const ogImg = $('meta[property="og:image"]').attr("content");
    if (ogImg) logoUrl = ogImg;
  }

  // ── Page images (for gallery) ─────────────────────────────────────────────
  // Collect all meaningful images, deduplicate by unique media ID to avoid size variants
  const rawImgSrcs: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src && !src.startsWith("data:") && src.length > 10) {
      const abs = src.startsWith("http") ? src : (() => {
        try { return new URL(src, url).href; } catch { return null; }
      })();
      if (abs) rawImgSrcs.push(abs);
    }
  });
  // Also grab srcset and picture source elements
  $("source, img").each((_, el) => {
    const srcset = $(el).attr("srcset") || $(el).attr("data-srcset");
    if (srcset) {
      // Extract just the first URL from srcset
      const first = srcset.split(",")[0].trim().split(" ")[0];
      if (first && first.startsWith("http")) rawImgSrcs.push(first);
    }
  });

  // Deduplicate: for CDN images with size variants, keep the highest resolution (r_1200)
  // Group by unique media filename/ID
  const mediaIdMap = new Map<string, string>();
  for (const src of rawImgSrcs) {
    // Extract unique media ID from URL — works for leadconnectorhq, filesafe, cloudinary patterns
    const mediaMatch = src.match(/\/media\/([a-f0-9]{20,})/i) || src.match(/\/([a-f0-9]{20,})\./i);
    if (mediaMatch) {
      const mediaId = mediaMatch[1];
      // Prefer r_1200 (highest res) — if we already have one, only replace with higher res
      const existing = mediaIdMap.get(mediaId);
      if (!existing || src.includes("r_1200") || (!existing.includes("r_1200") && src.includes("r_900"))) {
        mediaIdMap.set(mediaId, src);
      }
    } else {
      // Not a CDN image — add directly, dedup by full URL
      mediaIdMap.set(src, src);
    }
  }

  // Filter out likely icons, tracking pixels, tiny images
  const SKIP_PATTERNS = /favicon|icon|pixel|tracker|1x1|badge|arrow|chevron|logo|spinner|loader|star|rating|avatar|profile|flag|sprite|placeholder/i;
  const images = [...mediaIdMap.values()]
    .filter(src => !SKIP_PATTERNS.test(src))
    .slice(0, 12); // Max 12 gallery images

  // ── Contact ─────────────────────────────────────────────────────────────────
  const pageText = $("body").text();
  const phoneMatch = pageText.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const addressMatch = pageText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Way|Blvd)[.,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}/);

  // ── Services ────────────────────────────────────────────────────────────────
  const SERVICE_BLACKLIST = new Set([
    "facebook","instagram","twitter","youtube","linkedin","tiktok","pinterest","yelp","google",
    "home","about","contact","menu","blog","news","login","sign in","sign up","register",
    "privacy policy","terms","sitemap","careers","jobs","faq","search","click here","read more",
    "learn more","get started","book now","call now","email us","follow us","share","like",
    "subscribe","newsletter","copyright","all rights reserved","powered by",
  ]);
  const services: string[] = [];
  $("h2, h3").each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    const lower = text.toLowerCase();
    const isBlacklisted = [...SERVICE_BLACKLIST].some(b => lower.includes(b));
    const hasNumber = /^\d/.test(text);
    const tooLong = text.length > 55;
    const tooShort = text.length < 4;
    if (!isBlacklisted && !hasNumber && !tooLong && !tooShort && services.length < 6) {
      services.push(text);
    }
  });
  if (services.length < 2) {
    $("li").each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, " ");
      const lower = text.toLowerCase();
      const isBlacklisted = [...SERVICE_BLACKLIST].some(b => lower.includes(b));
      if (!isBlacklisted && text.length > 4 && text.length < 45 && services.length < 6) {
        services.push(text);
      }
    });
  }

  return {
    businessName: businessName.trim(),
    description:  description.trim(),
    colors:       uniqueColors,
    logoUrl,
    images,
    phone:        phoneMatch   ? phoneMatch[1].trim()  : null,
    email:        emailMatch   ? emailMatch[0]          : null,
    address:      addressMatch ? addressMatch[0].trim() : null,
    services:     services.slice(0, 6),
    headline:     headline.trim(),
    url,
  };
}

// ── Known-brand enrichment ────────────────────────────────────────────────────
interface BrandSeed {
  businessName: string;
  description: string;
  headline: string;
  services: string[];
  colors: string[];
}

const KNOWN_BRANDS: { pattern: RegExp; seed: BrandSeed }[] = [
  {
    pattern: /stripe\.com/,
    seed: {
      businessName: "Stripe",
      description: "Stripe powers online and in-person payment processing and financial solutions for businesses of all sizes.",
      headline: "Financial infrastructure for the internet",
      services: ["Payments", "Billing & Subscriptions", "Stripe Connect", "Radar Fraud Detection", "Stripe Terminal", "Stripe Atlas"],
      colors: ["#635bff", "#0a2540"],
    },
  },
  {
    pattern: /shopify\.com/,
    seed: {
      businessName: "Shopify",
      description: "Build your business with Shopify — sell online, in-person, and everywhere in between.",
      headline: "Start selling with Shopify",
      services: ["Online Store", "Point of Sale", "Shopify Payments", "Shopify Plus", "Marketing & SEO", "Analytics & Reports"],
      colors: ["#96bf48", "#004c3f"],
    },
  },
  {
    pattern: /github\.com/,
    seed: {
      businessName: "GitHub",
      description: "GitHub is where the world builds software.",
      headline: "Where the world builds software",
      services: ["Code Repositories", "GitHub Actions CI/CD", "GitHub Copilot", "Code Review", "GitHub Pages", "Security Scanning"],
      colors: ["#24292f", "#0969da"],
    },
  },
];

function enrichKnownBrand(scraped: ScrapeResult, href: string): ScrapeResult {
  let hostname = "";
  try { hostname = new URL(href).hostname.replace("www.", ""); } catch { return scraped; }
  const match = KNOWN_BRANDS.find(b => b.pattern.test(hostname));
  if (!match) return scraped;
  const seed = match.seed;
  return {
    ...scraped,
    businessName: scraped.businessName || seed.businessName,
    description:  !scraped.description || scraped.description.length < 30 ? seed.description : scraped.description,
    headline:     !scraped.headline    || scraped.headline.length < 5     ? seed.headline    : scraped.headline,
    services:     scraped.services.length < 2 ? seed.services : scraped.services,
    colors:       scraped.colors.length < 2   ? seed.colors   : scraped.colors,
  };
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
        logoUrl: null,
        images: [],
        phone: null, email: null, address: null,
        services: ["Our Services","Quality Work","Customer Care"],
        headline: "Welcome", url: parsed.href,
      };
    }

    scraped = enrichKnownBrand(scraped, parsed.href);

    console.log(`[scrape] ${parsed.hostname} → businessName="${scraped.businessName}" images=${scraped.images.length} services=${scraped.services.length}`);

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
        colors:   scraped.colors,
        phone:    scraped.phone,
        email:    scraped.email,
        services: scraped.services,
        images:   scraped.images,
      },
    });
  } catch (err) {
    console.error("/api/scrape error:", err);
    return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
  }
}
