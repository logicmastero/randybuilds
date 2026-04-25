/**
 * /api/auth/sync
 * Sync Supabase auth user to Neon database.
 * Called from client-side after login or by callback endpoint.
 * Creates or updates user record in Neon.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { upsertUser } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    return NextResponse.json({ ok: true, synced: false, reason: "auth_not_configured" });
  }

  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ ok: false, error: "Not authenticated", synced: false }, { status: 401 });
  }

  try {
    const neonUser = await upsertUser({
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      avatar_url: user.user_metadata?.avatar_url || undefined,
      provider: "google",
    });

    return NextResponse.json({
      ok: true,
      synced: true,
      user: {
        id: neonUser.id,
        email: neonUser.email,
        name: neonUser.name,
        plan: neonUser.plan,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/sync] Error syncing user to Neon:", msg);
    // Don't fail the response — sync is best-effort
    return NextResponse.json({ ok: true, synced: false, error: msg });
  }
}
