import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getUserSites, getLeads, getDb } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Auth via Supabase session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
    return NextResponse.json({ ok: true, projects: [], stats: buildEmptyStats(), source: "no-auth" });
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
    // Fetch from Neon in parallel
    const [sites, leads, genStats] = await Promise.all([
      getUserSites(user.id).catch(() => []),
      getLeads().catch(() => []),
      getGenerationStats(user.id).catch(() => ({ total: 0, today: 0, this_week: 0, avg_ms: 0 })),
    ]);

    const projects = sites.map(s => ({
      id: s.id,
      business_name: s.business_name,
      slug: s.slug,
      url: s.url,
      source: s.source,
      industry: s.industry,
      is_published: s.is_published,
      view_count: s.view_count,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    const stats = {
      total_sites: sites.length,
      published_sites: sites.filter(s => s.is_published).length,
      total_leads: leads.length,
      leads_by_stage: groupByStage(leads),
      generations: genStats,
    };

    return NextResponse.json({ ok: true, projects, stats, source: "neon" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[projects/list]", msg);
    return NextResponse.json({ ok: true, projects: [], stats: buildEmptyStats(), source: "error", warning: msg });
  }
}

async function getGenerationStats(userId: string) {
  const db = getDb();
  const rows = await db`
    SELECT
      COUNT(*)::int                                                         AS total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day')::int  AS today,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS this_week,
      ROUND(AVG(duration_ms))::int                                         AS avg_ms
    FROM generation_log
    WHERE (user_id = ${userId} OR user_id IS NULL)
  `;
  return rows[0] as { total: number; today: number; this_week: number; avg_ms: number };
}

function groupByStage(leads: Array<{ stage: string }>) {
  return leads.reduce((acc: Record<string, number>, l) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1;
    return acc;
  }, {});
}

function buildEmptyStats() {
  return {
    total_sites: 0,
    published_sites: 0,
    total_leads: 0,
    leads_by_stage: {},
    generations: { total: 0, today: 0, this_week: 0, avg_ms: 0 },
  };
}
