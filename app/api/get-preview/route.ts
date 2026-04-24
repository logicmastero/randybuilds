import { NextRequest, NextResponse } from "next/server";
import { getPreview } from "../../../lib/preview-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const preview = await getPreview(slug);
  if (!preview) return NextResponse.json({ error: "Preview not found" }, { status: 404 });

  return NextResponse.json({
    html: preview.html,
    businessName: preview.businessName,
    url: preview.url,
    source: preview.source,
  });
}
