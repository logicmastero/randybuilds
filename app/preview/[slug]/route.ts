import { NextRequest, NextResponse } from "next/server";
import { getPreview, isRedisConfigured } from "../../../lib/preview-store";

export const maxDuration = 15;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  console.log(`[preview] Fetching slug="${slug}" redis=${isRedisConfigured()}`);

  const preview = await getPreview(slug);

  if (!preview) {
    console.warn(`[preview] Not found: ${slug}`);
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Preview Not Found</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet">
</head><body style="background:#080808;color:#f0f0f0;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px">
<div>
  <div style="font-size:3rem;margin-bottom:16px">⏱</div>
  <h1 style="font-size:2rem;font-weight:900;margin-bottom:12px">Preview not found</h1>
  <p style="color:#555;margin-bottom:8px;max-width:400px;margin-left:auto;margin-right:auto">This link may have expired, or the preview was generated before persistent storage was enabled.</p>
  <p style="color:#333;font-size:.85rem;margin-bottom:32px">Slug: <code style="color:#666">${slug}</code></p>
  <a href="/" style="padding:14px 32px;background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#000;border-radius:10px;font-weight:800;font-size:.95rem;text-decoration:none;display:inline-block">Generate New Preview →</a>
</div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Add source badge via header so we can verify in curl
  return new NextResponse(preview.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Preview-Source": preview.source,
      "X-Preview-Business": preview.businessName,
      "X-Preview-Redis": isRedisConfigured() ? "true" : "false",
    },
  });
}
