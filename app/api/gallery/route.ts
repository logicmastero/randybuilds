import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "24"), 50);
  const cursor = req.nextUrl.searchParams.get("cursor"); // created_at for pagination
  const industry = req.nextUrl.searchParams.get("industry");

  try {
    const db = getDb();

    // Fetch public previews from preview_sessions (anonymous)
    // and published saved_sites, combined + deduplicated
    const rows = await db`
      SELECT
        slug,
        business_name,
        source,
        input_url,
        industry,
        view_count,
        created_at,
        'preview' AS record_type
      FROM preview_sessions
      WHERE
        html IS NOT NULL
        AND LENGTH(html) > 500
        AND deleted_at IS NULL
        ${cursor ? db`AND created_at < ${cursor}` : db``}
        ${industry ? db`AND industry = ${industry}` : db``}

      UNION ALL

      SELECT
        slug,
        business_name,
        source,
        url AS input_url,
        industry,
        view_count,
        created_at,
        'saved' AS record_type
      FROM saved_sites
      WHERE
        is_published = true
        AND deleted_at IS NULL
        ${cursor ? db`AND created_at < ${cursor}` : db``}
        ${industry ? db`AND industry = ${industry}` : db``}

      ORDER BY view_count DESC, created_at DESC
      LIMIT ${limit}
    `;

    // Get distinct industries for filtering
    const industries = await db`
      SELECT DISTINCT industry FROM preview_sessions
      WHERE industry IS NOT NULL AND html IS NOT NULL
      ORDER BY industry ASC
      LIMIT 20
    `.catch(() => []);

    const nextCursor = rows.length === limit ? rows[rows.length - 1]?.created_at : null;

    return NextResponse.json({
      ok: true,
      items: rows,
      industries: industries.map((r: { industry: string }) => r.industry),
      next_cursor: nextCursor,
      count: rows.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[gallery]", msg);
    return NextResponse.json({ ok: true, items: [], industries: [], warning: msg });
  }
}
