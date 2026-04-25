import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const sql = getDb();
    const leads = await sql`SELECT * FROM leads WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 100`;
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
