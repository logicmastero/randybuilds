import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { upsertUser } from "../../../../lib/db";

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

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  const redirectTo = next.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
  const res = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    console.error("[auth/callback] Exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Sync user to Neon (fire-and-forget, don't block redirect)
  const user = data.user;
  if (user?.id && user?.email) {
    upsertUser({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      avatar_url: user.user_metadata?.avatar_url || undefined,
      provider: "google",
    }).catch((e: unknown) => {
      console.error("[auth/callback] Neon sync failed:", e instanceof Error ? e.message : String(e));
    });
  }

  return res;
}
