import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const sql = getDb();
    const sites = await sql`
      SELECT id, name, slug, created_at, updated_at
      FROM saved_sites
      WHERE user_id = ${user.id} AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
