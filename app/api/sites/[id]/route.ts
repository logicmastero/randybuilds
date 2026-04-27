import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const sql = getDb();
    const [site] = await sql`
      SELECT id, slug, business_name, title, description, url, html,
             is_published, thumbnail_url, industry, color_scheme,
             view_count, created_at, updated_at,
             COALESCE(custom_domain,'') as custom_domain,
             COALESCE(seo_title,'') as seo_title,
             COALESCE(seo_description,'') as seo_description,
             COALESCE(analytics_id,'') as analytics_id,
             COALESCE(password_protected, false) as password_protected
      FROM saved_sites
      WHERE id = ${params.id} AND user_id = ${user.id} AND deleted_at IS NULL
    `;
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ site });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const body = await req.json();
    const sql = getDb();

    const [existing] = await sql`
      SELECT id FROM saved_sites WHERE id = ${params.id} AND user_id = ${user.id} AND deleted_at IS NULL
    `;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Explicit per-field updates — safe, no sql injection
    if ("business_name" in body) await sql`UPDATE saved_sites SET business_name=${body.business_name}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("is_published" in body) await sql`UPDATE saved_sites SET is_published=${body.is_published}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("html" in body) await sql`UPDATE saved_sites SET html=${body.html}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("title" in body) await sql`UPDATE saved_sites SET title=${body.title}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("description" in body) await sql`UPDATE saved_sites SET description=${body.description}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("seo_title" in body) await sql`UPDATE saved_sites SET seo_title=${body.seo_title}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("seo_description" in body) await sql`UPDATE saved_sites SET seo_description=${body.seo_description}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("custom_domain" in body) await sql`UPDATE saved_sites SET custom_domain=${body.custom_domain}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("analytics_id" in body) await sql`UPDATE saved_sites SET analytics_id=${body.analytics_id}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("password_protected" in body) await sql`UPDATE saved_sites SET password_protected=${body.password_protected}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("site_password" in body) await sql`UPDATE saved_sites SET site_password=${body.site_password}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("color_scheme" in body) await sql`UPDATE saved_sites SET color_scheme=${body.color_scheme}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    if ("thumbnail_url" in body) await sql`UPDATE saved_sites SET thumbnail_url=${body.thumbnail_url}, updated_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionFromRequest(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const sql = getDb();
    await sql`UPDATE saved_sites SET deleted_at=NOW() WHERE id=${params.id} AND user_id=${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
