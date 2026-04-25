import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Send welcome email for new users (first login)
  const isNewUser = data.user?.created_at === data.user?.last_sign_in_at;
  if (isNewUser && data.user?.email) {
    try {
      await fetch(`${origin}/api/auth/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "there",
        }),
      });
    } catch (e) {
      console.error("[auth/callback] welcome email failed:", e);
    }
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  return res;
}
