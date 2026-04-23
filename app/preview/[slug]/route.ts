import { NextRequest, NextResponse } from "next/server";
import { previewStore } from "../../api/scrape/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const preview = previewStore.get(slug);

  if (!preview) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Preview Expired</title></head><body style="background:#080808;color:#f0f0f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1 style="font-size:2rem;margin-bottom:16px">Preview expired</h1><p style="color:#666;margin-bottom:32px">This preview link has expired. Generate a new one!</p><a href="/" style="padding:14px 32px;background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#000;border-radius:10px;font-weight:700;text-decoration:none">Generate New Preview →</a></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(preview.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
