import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { saveSite } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = body.project || body;
  if (!project) return NextResponse.json({ ok: false, error: "Missing project" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return NextResponse.json({ ok: true, saved: "no-auth-skipped" });
  }

  const res = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
        });
      },
    },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const saved = await saveSite({
      user_id: user.id,
      slug: project.slug || `site-${Date.now()}`,
      business_name: project.businessName || project.business_name || "Untitled",
      html: project.html || "",
      url: project.sourceUrl || project.url || undefined,
      source: project.source || "claude",
      industry: project.industry || undefined,
      color_scheme: project.colorScheme || undefined,
      generation_ms: project.generationMs || undefined,
    });

    return NextResponse.json({ ok: true, saved: "neon", id: saved.id, slug: saved.slug });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[projects/save]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
