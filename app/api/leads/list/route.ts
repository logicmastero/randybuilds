import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-server";
import { getLeads } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated — leads are global for now
    const supabase = createSupabaseRouteClient(req, NextResponse.next());
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all leads (non-deleted)
    const leads = await getLeads();

    // Group by stage
    const byStage: Record<string, number> = {};
    let totalDealValue = 0;
    for (const lead of leads) {
      byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;
      if (lead.deal_value) totalDealValue += lead.deal_value;
    }

    return NextResponse.json({
      success: true,
      leads: leads.map((l) => ({
        id: l.id,
        businessName: l.business_name,
        ownerName: l.owner_name,
        businessType: l.business_type,
        url: l.url,
        email: l.email,
        phone: l.phone,
        city: l.city,
        province: l.province,
        notes: l.notes,
        stage: l.stage,
        dealValue: l.deal_value,
        outreachDate: l.outreach_date,
        followUpDate: l.follow_up_date,
        source: l.source,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      })),
      summary: {
        total: leads.length,
        byStage,
        totalDealValue,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[leads/list] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
