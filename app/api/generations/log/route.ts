import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();
    const log = await db`
      SELECT id, input_type, input_value, model, duration_ms, success, error_message, created_at
      FROM generation_log
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ ok: true, log });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[generations/log]", msg);
    return NextResponse.json({ ok: true, log: [], warning: msg });
  }
}
