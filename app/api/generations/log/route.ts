import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { getDb } from "@/lib/db";

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

    const db = getDb();

    // Get generation logs for this user, last 100
    const logs = (await db`
      SELECT * FROM generation_log
      WHERE user_id = ${session.user.id} OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `) as unknown as Array<{
      id: string;
      input_type: string;
      input_value?: string;
      model: string;
      duration_ms?: number;
      success: boolean;
      error_message?: string;
      created_at: string;
    }>;

    // Compute stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: logs.length,
      today: logs.filter((l) => new Date(l.created_at) >= today).length,
      this_week: logs.filter((l) => new Date(l.created_at) >= weekAgo).length,
      successful: logs.filter((l) => l.success).length,
      avg_ms: logs.length
        ? Math.round(
            logs
              .filter((l) => l.duration_ms)
              .reduce((acc, l) => acc + (l.duration_ms || 0), 0) / logs.filter((l) => l.duration_ms).length
          )
        : 0,
    };

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        inputType: l.input_type,
        inputValue: l.input_value,
        model: l.model,
        durationMs: l.duration_ms,
        success: l.success,
        errorMessage: l.error_message,
        createdAt: l.created_at,
      })),
      stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generations/log] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
