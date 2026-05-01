import { NextRequest, NextResponse } from "next/server";
import { getConversionMetrics } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/analytics/dashboard?sites=slug1,slug2
 * Retrieves conversion metrics for user's sites
 * 
 * Returns:
 * [
 *   {
 *     site_slug: string,
 *     total_pageviews: number,
 *     form_starts: number,
 *     form_submits: number,
 *     conversion_rate: number,
 *     avg_scroll_depth: number,
 *     avg_time_on_page_ms: number
 *   }
 * ]
 */
export async function GET(req: NextRequest) {
  try {
    const sitesParam = req.nextUrl.searchParams.get("sites");
    const sites = sitesParam ? sitesParam.split(",").filter(Boolean) : [];

    if (sites.length === 0) {
      return NextResponse.json(
        { error: "Please provide site slugs: ?sites=slug1,slug2" },
        { status: 400 }
      );
    }

    const metrics = await getConversionMetrics(sites);
    return NextResponse.json({
      success: true,
      metrics,
      summary: {
        total_sites: metrics.length,
        total_pageviews: metrics.reduce((sum, m) => sum + m.total_pageviews, 0),
        avg_conversion_rate: metrics.length > 0 
          ? (metrics.reduce((sum, m) => sum + (m.conversion_rate || 0), 0) / metrics.length).toFixed(2)
          : 0,
      },
    });
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
