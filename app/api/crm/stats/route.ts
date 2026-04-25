import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const sql = getDb();
    const [sitesRow] = await sql`
      SELECT COUNT(*) as count FROM saved_sites WHERE user_id = ${user.id} AND deleted_at IS NULL
    `;
    const [gensRow] = await sql`
      SELECT COUNT(*) as count FROM generation_log WHERE user_id = ${user.id}
    `;
    return NextResponse.json({
      sites: Number(sitesRow?.count ?? 0),
      generations: Number(gensRow?.count ?? 0),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
