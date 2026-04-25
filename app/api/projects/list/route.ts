import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return NextResponse.json({ ok: true, projects: [], source: "local" });
  }

  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!serviceRoleKey || serviceRoleKey.includes("placeholder")) {
    return NextResponse.json({ ok: true, projects: [], source: "local" });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(supabaseUrl!, serviceRoleKey!);
    const { data, error } = await admin
      .from("projects")
      .select("id,business_name,source_url,preview_url,slug,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ ok: true, projects: data || [], source: "db" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[list-projects] DB error:", msg);
    return NextResponse.json({ ok: true, projects: [], source: "local", warning: msg });
  }
}
