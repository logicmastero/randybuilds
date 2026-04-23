import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const maxDuration = 45;

export interface ScrapeResult {
  businessName: string;
  description: string;
  colors: string[];
  logoUrl: string | null;
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

  let logoUrl: string | null = null;
  for (const sel of ['img[src*="logo"]','img[alt*="logo" i]','img[class*="logo" i]','header img']) {
    const src = $(sel).first().attr("src");
    if (src) { logoUrl = src.startsWith("http") ? src : new URL(src, url).href; break; }
  }

  const pageText = $("body").text();
  const phoneMatch = pageText.match(/(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const addressMatch = pageText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Way|Blvd)[.,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}/);

  const services: string[] = [];
  $("h2, h3, li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 60 && services.length < 8) services.push(text);
  });

  return {
    businessName: businessName.trim(),
    description:  description.trim(),
    colors:       uniqueColors,
    logoUrl,
    phone:        phoneMatch   ? phoneMatch[1].trim()  : null,
    email:        emailMatch   ? emailMatch[0]          : null,
    address:      addressMatch ? addressMatch[0].trim() : null,
    services:     services.slice(0, 6),
    headline:     headline.trim(),
    url,
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

    // Step 1 — scrape
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
        headline: "Welcome", url: parsed.href,
      };
    }

    // Step 2 — pipe straight into /api/redesign (same process, no HTTP hop)
    const { POST: redesignHandler } = await import("../redesign/route");
    const redesignReq = new Request("http://localhost/api/redesign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scraped }),
    });
    const redesignRes = await redesignHandler(new NextRequest(redesignReq));
    const redesignData = await redesignRes.json();

    // Return merged payload to frontend
    return NextResponse.json({
      ...redesignData,
      previewHtml: redesignData.previewHtml ?? null,
      scraped: {
        colors:   scraped.colors,
        phone:    scraped.phone,
        email:    scraped.email,
        services: scraped.services,
      },
    });
  } catch (err) {
    console.error("/api/scrape error:", err);
    return NextResponse.json({ error: "Failed to analyze website" }, { status: 500 });
  }
}
