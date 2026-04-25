import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/auth/me] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
