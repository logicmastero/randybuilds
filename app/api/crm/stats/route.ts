import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          const response = NextResponse.next();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = getDb();

    // Total sites for user
    const sitesRes = await db`
      SELECT COUNT(*) as count FROM saved_sites
      WHERE user_id = ${user.id} AND deleted_at IS NULL
    `;
    const total_sites = sitesRes[0]?.count || 0;

    // Published sites
    const pubRes = await db`
      SELECT COUNT(*) as count FROM saved_sites
      WHERE user_id = ${user.id} AND is_published = true AND deleted_at IS NULL
    `;
    const published_sites = pubRes[0]?.count || 0;

    // Generations this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const genRes = await db`
      SELECT COUNT(*) as count FROM generation_log
      WHERE user_id = ${user.id} AND created_at >= ${monthStart.toISOString()}
    `;
    const total_generations = genRes[0]?.count || 0;

    // Leads in pipeline
    const leadsRes = await db`
      SELECT COUNT(*) as count FROM leads WHERE deleted_at IS NULL
    `;
    const total_leads = leadsRes[0]?.count || 0;

    return NextResponse.json({
      total_sites: Number(total_sites) || 0,
      published_sites: Number(published_sites) || 0,
      total_generations: Number(total_generations) || 0,
      total_leads: Number(total_leads) || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/crm/stats] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
