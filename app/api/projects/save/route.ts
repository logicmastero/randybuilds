import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const { name, html, slug } = body;
    if (!html) return NextResponse.json({ error: "html required" }, { status: 400 });

    const sql = getDb();
    const finalSlug = slug || `site-${Date.now()}`;
    const finalName = name || "My Site";

    const [existing] = await sql`
      SELECT id FROM saved_sites WHERE slug = ${finalSlug} AND user_id = ${user.id} AND deleted_at IS NULL
    `;

    if (existing) {
      await sql`
        UPDATE saved_sites SET html = ${html}, name = ${finalName}, updated_at = NOW()
        WHERE id = ${existing.id}
      `;
      return NextResponse.json({ ok: true, slug: finalSlug, id: existing.id });
    } else {
      const [newSite] = await sql`
        INSERT INTO saved_sites (user_id, name, slug, html, created_at, updated_at)
        VALUES (${user.id}, ${finalName}, ${finalSlug}, ${html}, NOW(), NOW())
        RETURNING id
      `;
      return NextResponse.json({ ok: true, slug: finalSlug, id: newSite.id });
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
