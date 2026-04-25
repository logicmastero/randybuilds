import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project } = body;

  if (!project) {
    return NextResponse.json({ ok: false, error: "Missing project" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    // Supabase not configured — tell client to save locally
    return NextResponse.json({ ok: true, saved: "local" });
  }

  // Get authenticated user from cookie
  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{name:string; value:string; options:Record<string,unknown>}>) {
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

  // Save to Supabase using service role (bypasses RLS)
  if (serviceRoleKey && !serviceRoleKey.includes("placeholder")) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(supabaseUrl!, serviceRoleKey!);
      const { data, error } = await admin.from("projects").upsert({
        id: project.id,
        user_id: user.id,
        business_name: project.businessName,
        source_url: project.sourceUrl || null,
        html: project.html || null,
        slug: project.slug || null,
        preview_url: project.previewUrl || null,
        copy: project.copy ? JSON.stringify(project.copy) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
      if (error) throw error;
      return NextResponse.json({ ok: true, saved: "db", data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[save-project] DB error:", msg);
      return NextResponse.json({ ok: true, saved: "local", warning: msg });
    }
  }

  return NextResponse.json({ ok: true, saved: "local" });
}
