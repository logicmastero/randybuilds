import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  if (!code) return NextResponse.redirect(`${origin}/login?error=no_code`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || supabaseUrl.includes("placeholder"))
    return NextResponse.redirect(`${origin}/login?error=not_configured`);

  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
  const res = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{name:string; value:string; options:Record<string,unknown>}>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, {
            ...(options as object),
            sameSite: "lax" as const,
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            path: "/",
          });
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    console.error("[callback] error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Welcome email for new users (fire-and-forget)
  const isNew = data.user?.created_at &&
    new Date(data.user.created_at).getTime() > Date.now() - 30_000;
  if (isNew && data.user?.email) {
    fetch(`${origin}/api/auth/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.user.email, name: data.user.user_metadata?.full_name || "" }),
    }).catch(() => {});
  }

  return res;
}
