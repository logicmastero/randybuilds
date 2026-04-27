import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Only allow from server (no auth needed — called once during setup)
  const sql = getDb();
  try {
    await sql`
      ALTER TABLE saved_sites
        ADD COLUMN IF NOT EXISTS custom_domain TEXT,
        ADD COLUMN IF NOT EXISTS seo_title TEXT,
        ADD COLUMN IF NOT EXISTS seo_description TEXT,
        ADD COLUMN IF NOT EXISTS analytics_id TEXT,
        ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS site_password TEXT,
        ADD COLUMN IF NOT EXISTS name TEXT
    `;
    return NextResponse.json({ ok: true, message: "Migration complete" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const sql = getDb();
  try {
    await sql`
      ALTER TABLE saved_sites
        ADD COLUMN IF NOT EXISTS custom_domain TEXT,
        ADD COLUMN IF NOT EXISTS seo_title TEXT,
        ADD COLUMN IF NOT EXISTS seo_description TEXT,
        ADD COLUMN IF NOT EXISTS analytics_id TEXT,
        ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS site_password TEXT,
        ADD COLUMN IF NOT EXISTS name TEXT
    `;
    return NextResponse.json({ ok: true, message: "Migration complete" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
