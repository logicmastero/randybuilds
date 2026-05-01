import { NextRequest, NextResponse } from "next/server";
import { logPageviewEvent, getPageviewEvents } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/analytics/pageview
 * Logs a pageview event to persistent Neon storage
 * 
 * Body:
 * {
 *   site_slug: string,
 *   event_type: "pageview" | "scroll" | "click" | "form_start" | "form_submit",
 *   page_path?: string,
 *   scroll_depth?: number (0-100),
 *   time_on_page?: number (ms),
 *   viewport_width?: number,
 *   viewport_height?: number,
 *   referrer?: string,
 *   user_agent?: string,
 *   session_id?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const { site_slug } = event;

    if (!site_slug) {
      return NextResponse.json({ error: "Missing site_slug" }, { status: 400 });
    }

    // Log to persistent database
    await logPageviewEvent({
      site_slug,
      event_type: event.event_type || "pageview",
      page_path: event.page_path,
      scroll_depth: event.scroll_depth,
      time_on_page: event.time_on_page,
      viewport_width: event.viewport_width,
      viewport_height: event.viewport_height,
      referrer: event.referrer,
      user_agent: event.user_agent,
      session_id: event.session_id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics pageview error:", error);
    return NextResponse.json(
      { error: "Failed to record pageview" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/pageview?site_slug=slug&limit=100&offset=0
 * Retrieves pageview events for a site
 */
export async function GET(req: NextRequest) {
  try {
    const siteSlug = req.nextUrl.searchParams.get("site_slug");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "1000");
    const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

    if (!siteSlug) {
      return NextResponse.json({ error: "Missing site_slug" }, { status: 400 });
    }

    const events = await getPageviewEvents([siteSlug], Math.min(limit, 5000), offset);
    return NextResponse.json({
      total: events.length,
      site_slug: siteSlug,
      events,
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pageviews" },
      { status: 500 }
    );
  }
}
