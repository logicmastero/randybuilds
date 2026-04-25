import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/analytics/pageview
 * Receives pageview events from generated sites
 * Stores in-memory for now (can upgrade to database later)
 */

const pageviewStore = new Map<string, any[]>();

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const { site_slug } = event;

    if (!site_slug) {
      return NextResponse.json({ error: "Missing site_slug" }, { status: 400 });
    }

    // Store pageview in memory
    if (!pageviewStore.has(site_slug)) {
      pageviewStore.set(site_slug, []);
    }
    pageviewStore.get(site_slug)!.push({
      ...event,
      received_at: new Date().toISOString(),
    });

    // Keep only last 10,000 pageviews per site to avoid memory issues
    const store = pageviewStore.get(site_slug)!;
    if (store.length > 10000) {
      store.shift();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics pageview error:", error);
    return NextResponse.json({ error: "Failed to record pageview" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const siteSlug = req.nextUrl.searchParams.get("site_slug");
  if (!siteSlug) {
    return NextResponse.json({ error: "Missing site_slug" }, { status: 400 });
  }
  const events = pageviewStore.get(siteSlug) || [];
  return NextResponse.json({ total: events.length, events });
}
