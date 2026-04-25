import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  // Build the response we'll return (redirect to dashboard)
  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
  const res = NextResponse.redirect(redirectTo);

  // Create server client that writes cookies directly onto the response
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{name:string; value:string; options:Record<string,unknown>}>) {
        // Write cookies onto BOTH the request (for server) and response (for browser)
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, {
            ...options,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
          });
        });
      },
    },
  });

  // Exchange the PKCE code for a real session — this sets the cookies above
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  console.log(`[auth/callback] ✅ Session established for ${data.user?.email}`);

  // Welcome email for new users (fire-and-forget)
  const isNewUser = data.user?.created_at &&
    new Date(data.user.created_at).getTime() > Date.now() - 30_000;
  if (isNewUser && data.user?.email) {
    fetch(`${origin}/api/auth/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.user.email,
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || "",
      }),
    }).catch(e => console.error("[auth/callback] welcome email error:", e));
  }

  return res;
}
