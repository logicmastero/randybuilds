import { NextResponse } from 'next/server';
import { getLeads, createLead, logGeneration } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/crm/leads
 * Fetch all leads from Neon, sorted by follow_up_date
 */
export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json({ leads, ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crm] GET leads error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/crm/leads
 * Create a new lead
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lead = await createLead(body);

    // Log the creation
    await logGeneration({
      input_type: 'description',
      input_value: `Lead: ${body.business_name}`,
      success: true,
    }).catch(() => {});

    return NextResponse.json({ lead, ok: true }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crm] POST lead error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
