import { NextRequest, NextResponse } from "next/server";
import { previewStore } from "../../api/redesign/route";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const preview = previewStore.get(slug);

  if (!preview) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Preview Expired</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap" rel="stylesheet">
</head><body style="background:#080808;color:#f0f0f0;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px">
<div>
  <div style="font-size:3rem;margin-bottom:16px">⏱</div>
  <h1 style="font-size:2rem;font-weight:900;margin-bottom:12px">Preview expired</h1>
  <p style="color:#555;margin-bottom:32px;max-width:360px;margin-left:auto;margin-right:auto">This preview link has expired. Head back and generate a fresh one — takes about 30 seconds.</p>
  <a href="/" style="padding:14px 32px;background:linear-gradient(135deg,#00f5a0,#00d9f5);color:#000;border-radius:10px;font-weight:800;font-size:.95rem;text-decoration:none">Generate New Preview →</a>
</div></body></html>`,
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
