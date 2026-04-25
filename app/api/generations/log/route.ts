import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sql = getDb();
    await sql`
      INSERT INTO generation_log (user_id, prompt, model, duration_ms, created_at)
      VALUES (${user?.id ?? null}, ${body.prompt ?? ""}, ${body.model ?? "claude"}, ${body.duration_ms ?? 0}, NOW())
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
