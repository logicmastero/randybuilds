import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { getUserSites } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient(req, NextResponse.next());
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's saved sites from Neon
    const sites = await getUserSites(session.user.id);

    return NextResponse.json({
      success: true,
      projects: sites.map((s) => ({
        id: s.id,
        slug: s.slug,
        businessName: s.business_name,
        url: s.url,
        industry: s.industry,
        colorScheme: s.color_scheme,
        generationMs: s.generation_ms,
        viewCount: s.view_count,
        isPublished: s.is_published,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
      total: sites.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[projects/list] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
