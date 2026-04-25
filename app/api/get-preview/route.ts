import { NextRequest, NextResponse } from "next/server";
import { getPreview } from "../../../lib/preview-store";
import { getPreviewSession, getSiteBySlug } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  // 1. Try Redis (fastest, in-memory)
  const redisPreview = await getPreview(slug).catch(() => null);
  if (redisPreview) {
    return NextResponse.json({
      html: redisPreview.html,
      businessName: redisPreview.businessName,
      url: redisPreview.url,
      source: redisPreview.source,
      from: "redis",
    });
  }

  // 2. Try Neon preview_sessions (anonymous previews)
  const neonPreview = await getPreviewSession(slug).catch(() => null);
  if (neonPreview) {
    return NextResponse.json({
      html: neonPreview.html,
      businessName: neonPreview.business_name,
      url: neonPreview.input_url || "",
      source: neonPreview.source,
      from: "neon_preview",
    });
  }

  // 3. Try Neon saved_sites (user-saved sites)
  const savedSite = await getSiteBySlug(slug).catch(() => null);
  if (savedSite) {
    return NextResponse.json({
      html: savedSite.html,
      businessName: savedSite.business_name,
      url: savedSite.url || "",
      source: savedSite.source,
      from: "neon_saved",
    });
  }

  return NextResponse.json({ error: "Preview not found" }, { status: 404 });
}
