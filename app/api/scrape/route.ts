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

  // Social/nav blacklist — filter out junk that gets scraped as "services"
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
  // Fallback — try list items if no h2/h3 services found
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
    phone:        phoneMatch   ? phoneMatch[1].trim()  : null,
    email:        emailMatch   ? emailMatch[0]          : null,
    address:      addressMatch ? addressMatch[0].trim() : null,
    services:     services.slice(0, 6),
    headline:     headline.trim(),
    url,
  };
}

// ── Known-brand enrichment ────────────────────────────────────────────────────
// Many high-traffic sites (Stripe, Shopify, etc.) block serverless fetchers via
// Cloudflare. We seed their data so the scraper never returns empty for these.
// Keyed on hostname patterns.
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
      description: "Stripe powers online and in-person payment processing and financial solutions for businesses of all sizes. Accept payments, send payouts, and automate financial processes.",
      headline: "Financial infrastructure for the internet",
      services: ["Payments", "Billing & Subscriptions", "Stripe Connect", "Radar Fraud Detection", "Stripe Terminal", "Stripe Atlas"],
      colors: ["#635bff", "#0a2540"],
    },
  },
  {
    pattern: /shopify\.com/,
    seed: {
      businessName: "Shopify",
      description: "Build your business with Shopify — sell online, in-person, and everywhere in between. Millions of businesses trust Shopify to power their stores.",
      headline: "Start selling with Shopify",
      services: ["Online Store", "Point of Sale", "Shopify Payments", "Shopify Plus", "Marketing & SEO", "Analytics & Reports"],
      colors: ["#96bf48", "#004c3f"],
    },
  },
  {
    pattern: /square\.com|squareup\.com/,
    seed: {
      businessName: "Square",
      description: "Square helps millions of sellers run their business — from secure credit card processing to point of sale solutions.",
      headline: "Run your whole business with Square",
      services: ["Point of Sale", "Online Store", "Square Payroll", "Square Appointments", "Square Capital", "Square Marketing"],
      colors: ["#3e4348", "#28a745"],
    },
  },
  {
    pattern: /notion\.so/,
    seed: {
      businessName: "Notion",
      description: "Notion is the all-in-one workspace where you can write, plan, collaborate and get organized — everything you need, in one tool.",
      headline: "Your wiki, docs, and projects. Together.",
      services: ["Docs & Notes", "Wikis", "Project Management", "Databases", "AI Writing", "Templates"],
      colors: ["#000000", "#e9e5e3"],
    },
  },
  {
    pattern: /figma\.com/,
    seed: {
      businessName: "Figma",
      description: "Figma is the collaborative interface design tool where teams build products together — from early concepts to final handoff.",
      headline: "Design, prototype, and handoff in one place",
      services: ["UI Design", "Prototyping", "FigJam Whiteboarding", "Dev Mode", "Design Systems", "Collaboration"],
      colors: ["#f24e1e", "#a259ff"],
    },
  },
  {
    pattern: /vercel\.com/,
    seed: {
      businessName: "Vercel",
      description: "Vercel is the platform for frontend developers — deploy faster with built-in CI/CD, edge functions, and global CDN.",
      headline: "Develop. Preview. Ship.",
      services: ["Next.js Hosting", "Edge Functions", "Analytics", "Preview Deployments", "Vercel AI SDK", "Infrastructure"],
      colors: ["#000000", "#0070f3"],
    },
  },
  {
    pattern: /linear\.app/,
    seed: {
      businessName: "Linear",
      description: "Linear is the issue tracking tool built for modern software teams — fast, streamlined, and opinionated.",
      headline: "Linear is a better way to build products",
      services: ["Issue Tracking", "Project Cycles", "Roadmaps", "GitHub Sync", "Slack Integration", "Analytics"],
      colors: ["#5e6ad2", "#f2f2f2"],
    },
  },
  {
    pattern: /hubspot\.com/,
    seed: {
      businessName: "HubSpot",
      description: "HubSpot's CRM platform has all the tools and integrations you need for marketing, sales, content management, and customer service.",
      headline: "Grow better with HubSpot",
      services: ["Marketing Hub", "Sales Hub", "Service Hub", "CMS Hub", "Operations Hub", "CRM"],
      colors: ["#ff7a59", "#2d3e50"],
    },
  },
  {
    pattern: /salesforce\.com/,
    seed: {
      businessName: "Salesforce",
      description: "Salesforce unites marketing, sales, commerce, service, and IT teams to drive customer success from a single platform.",
      headline: "Bring companies and customers together",
      services: ["Sales Cloud", "Service Cloud", "Marketing Cloud", "Commerce Cloud", "Tableau Analytics", "Slack"],
      colors: ["#00a1e0", "#032d60"],
    },
  },
  {
    pattern: /github\.com/,
    seed: {
      businessName: "GitHub",
      description: "GitHub is where the world builds software. Millions of developers and companies build, ship, and maintain their software on GitHub.",
      headline: "Where the world builds software",
      services: ["Code Repositories", "GitHub Actions CI/CD", "GitHub Copilot", "Code Review", "GitHub Pages", "Security Scanning"],
      colors: ["#24292f", "#0969da"],
    },
  },
  {
    pattern: /aws\.amazon\.com|amazonaws\.com/,
    seed: {
      businessName: "Amazon Web Services",
      description: "AWS is the world's most comprehensive and broadly adopted cloud platform, offering over 200 fully featured services.",
      headline: "The world's most adopted cloud",
      services: ["Compute (EC2)", "Storage (S3)", "Databases (RDS)", "Machine Learning", "Serverless (Lambda)", "CDN (CloudFront)"],
      colors: ["#ff9900", "#232f3e"],
    },
  },
];

function enrichKnownBrand(scraped: ScrapeResult, href: string): ScrapeResult {
  let hostname = "";
  try { hostname = new URL(href).hostname.replace("www.", ""); } catch { return scraped; }

  const match = KNOWN_BRANDS.find(b => b.pattern.test(hostname));
  if (!match) return scraped;

  const seed = match.seed;
  // Only enrich fields that came back thin from the scraper
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

    // Step 1b — enrich with known-brand data if scrape returned thin results
    scraped = enrichKnownBrand(scraped, parsed.href);

    console.log(`[scrape] ${parsed.hostname} → businessName="${scraped.businessName}" headline="${scraped.headline.slice(0,60)}" services=${scraped.services.length} description=${scraped.description.length}chars`);

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
