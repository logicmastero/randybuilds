import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();
    const leads = await db`
      SELECT id, business_name, owner_name, city, province, stage,
             deal_value, follow_up_date, outreach_date, source, created_at
      FROM leads
      WHERE deleted_at IS NULL
      ORDER BY follow_up_date ASC NULLS LAST, created_at DESC
      LIMIT 100
    `;
    return NextResponse.json({ ok: true, leads });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[leads/list]", msg);
    return NextResponse.json({ ok: true, leads: [], warning: msg });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.business_name) {
      return NextResponse.json({ ok: false, error: "business_name required" }, { status: 400 });
    }
    const db = getDb();
    const rows = await db`
      INSERT INTO leads (
        business_name, owner_name, business_type, url, email, phone,
        city, province, notes, stage, deal_value, outreach_date,
        follow_up_date, source, facebook_url, instagram_url
      ) VALUES (
        ${body.business_name}, ${body.owner_name ?? null}, ${body.business_type ?? null},
        ${body.url ?? null}, ${body.email ?? null}, ${body.phone ?? null},
        ${body.city ?? null}, ${body.province ?? "AB"}, ${body.notes ?? null},
        ${body.stage ?? "new"}, ${body.deal_value ?? null}, ${body.outreach_date ?? null},
        ${body.follow_up_date ?? null}, ${body.source ?? "manual"},
        ${body.facebook_url ?? null}, ${body.instagram_url ?? null}
      ) RETURNING id, business_name, stage, created_at
    `;
    return NextResponse.json({ ok: true, lead: rows[0] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
