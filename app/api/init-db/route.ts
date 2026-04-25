import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await initDb();
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[init-db] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
