import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json();

  if (!email) return NextResponse.json({ ok: false, error: "no email" }, { status: 400 });

  const firstName = name?.split(" ")[0] || "there";

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to Sitecraft</title>
</head>
<body style="margin:0;padding:0;background:#0b0b09;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b09;padding:40px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#111110;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;max-width:560px">
      
      <!-- HEADER -->
      <tr><td style="padding:40px 48px 32px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:22px;font-weight:700;color:#e8e2d8;letter-spacing:-0.02em">
          Site<span style="color:#c8a96e">craft</span>
        </div>
      </td></tr>

      <!-- BODY -->
      <tr><td style="padding:40px 48px">
        <div style="font-size:28px;font-weight:700;color:#e8e2d8;letter-spacing:-0.02em;line-height:1.2;margin-bottom:16px">
          Welcome, ${firstName}. 👋
        </div>
        <div style="font-size:15px;color:rgba(232,226,216,0.6);line-height:1.75;margin-bottom:28px">
          You just unlocked the fastest way to get a premium website for your business — no agency, no guesswork, no $10,000 bill.
        </div>

        <!-- WHAT YOU GET -->
        <div style="background:#181816;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:28px;margin-bottom:28px">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#c8a96e;margin-bottom:16px">What you can do now</div>
          ${[
            ["✦", "Generate a site preview in 60 seconds", "Just paste your URL or describe your business"],
            ["✦", "Edit anything with AI", "Chat-based edits — no code, no designer needed"],
            ["✦", "Save & manage your projects", "All your sites in one dashboard"],
          ].map(([icon, title, desc]) => `
          <div style="display:flex;gap:14px;margin-bottom:18px">
            <div style="color:#c8a96e;font-size:16px;margin-top:1px;flex-shrink:0">${icon}</div>
            <div>
              <div style="font-size:14px;font-weight:600;color:#e8e2d8;margin-bottom:3px">${title}</div>
              <div style="font-size:13px;color:rgba(232,226,216,0.5);line-height:1.5">${desc}</div>
            </div>
          </div>
          `).join("")}
        </div>

        <!-- CTA -->
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://sitecraftai.vercel.app"}/dashboard" 
           style="display:block;width:100%;padding:16px;background:#c8a96e;color:#0b0b09;text-align:center;text-decoration:none;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:-0.01em;box-sizing:border-box">
          Go to my dashboard →
        </a>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:24px 48px;border-top:1px solid rgba(255,255,255,0.06)">
        <div style="font-size:12px;color:rgba(232,226,216,0.3);line-height:1.6">
          You're receiving this because you just signed up for Sitecraft.<br>
          Alberta, Canada · <a href="mailto:hello@sitecraftai.com" style="color:rgba(232,226,216,0.3)">hello@sitecraftai.com</a>
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
  `.trim();

  // Use Resend if available, else log
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sitecraft <welcome@sitecraftai.com>",
          to: [email],
          subject: `Welcome to Sitecraft, ${firstName} 👋`,
          html,
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.message || "Resend error");
      return NextResponse.json({ ok: true, id: result.id });
    } catch (e: unknown) {
      console.error("[welcome] email failed:", e);
    }
  } else {
    console.log(`[welcome] No RESEND_API_KEY — would have emailed: ${email}`);
  }

  return NextResponse.json({ ok: true });
}
