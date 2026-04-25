import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * PATCH /api/crm/leads/[id]
 * Update a lead (stage, deal_value, follow_up_date, etc.)
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const db = getDb();

    // Get current lead first
    const current = await db`SELECT * FROM leads WHERE id = ${id} LIMIT 1`;
    if (!current || current.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Apply updates
    const updated = {
      ...current[0],
      ...body,
      updated_at: new Date(),
    };

    // Update in DB
    const rows = await db`
      UPDATE leads
      SET
        stage = ${body.stage ?? current[0].stage},
        deal_value = ${body.deal_value ?? current[0].deal_value},
        follow_up_date = ${body.follow_up_date ?? current[0].follow_up_date},
        notes = ${body.notes ?? current[0].notes},
        owner_name = ${body.owner_name ?? current[0].owner_name},
        business_type = ${body.business_type ?? current[0].business_type},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json({ lead: rows[0], ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crm] PATCH lead error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/leads/[id]
 * Soft delete a lead (set deleted_at)
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const rows = await db`
      UPDATE leads
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: rows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crm] DELETE lead error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
