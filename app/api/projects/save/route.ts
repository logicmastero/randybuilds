import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { project } = await req.json();
  if (!project) return NextResponse.json({ ok: false, error: "Missing project" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || url.includes("placeholder")) return NextResponse.json({ ok: true, saved: "local" });

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

  if (!svc || svc.includes("placeholder")) return NextResponse.json({ ok: true, saved: "local" });

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, svc);
    const { error: dbErr } = await admin.from("projects").upsert({
      id: project.id,
      user_id: user.id,
      business_name: project.businessName || project.business_name,
      source_url: project.sourceUrl || project.source_url || null,
      html: project.html || null,
      slug: project.slug || null,
      preview_url: project.previewUrl || project.preview_url || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (dbErr) throw dbErr;
    return NextResponse.json({ ok: true, saved: "db" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[save]", msg);
    return NextResponse.json({ ok: true, saved: "local", warning: msg });
  }
}
