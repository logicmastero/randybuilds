import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || url.includes("placeholder")) return NextResponse.json({ ok: true, projects: [], source: "local" });

  const res = NextResponse.next();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{name:string; value:string; options:Record<string,unknown>}>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
        });
      },
    },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  if (!svc || svc.includes("placeholder")) return NextResponse.json({ ok: true, projects: [], source: "local" });

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, svc);
    const { data, error: dbErr } = await admin
      .from("projects")
      .select("id,business_name,source_url,preview_url,slug,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (dbErr) throw dbErr;
    return NextResponse.json({ ok: true, projects: data || [], source: "db" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: true, projects: [], source: "local", warning: msg });
  }
}
