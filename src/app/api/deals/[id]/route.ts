import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/deals/[id] - Get a single deal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('crm_deals')
      .select(`
        *,
        company:crm_companies(id, name, domain, logo_url, industry, size, website),
        contact:crm_contacts(id, first_name, last_name, email, phone, title),
        activities:crm_activities(id, type, subject, body, created_at)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ deal: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

// PATCH /api/deals/[id] - Update a deal
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current deal for stage change tracking
    const { data: currentDeal } = await supabase
      .from('crm_deals')
      .select('stage, name')
      .eq('id', id)
      .single();

    const updates: Record<string, any> = {};
    const allowedFields = [
      'name', 'description', 'stage', 'amount', 'expected_close_date',
      'company_id', 'primary_contact_id', 'priority', 'lead_source',
      'next_action', 'next_action_date', 'next_action_type', 'outcome', 'outcome_reason'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.last_activity_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('crm_deals')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        company:crm_companies(id, name, domain, logo_url),
        contact:crm_contacts(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;

    // Log stage change activity
    if (body.stage && currentDeal && body.stage !== currentDeal.stage) {
      await supabase.from('crm_activities').insert({
        deal_id: id,
        type: 'stage-change',
        stage_from: currentDeal.stage,
        stage_to: body.stage,
        subject: `Deal moved from ${currentDeal.stage} to ${body.stage}`,
      });
    }

    return NextResponse.json({ deal: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update deal' },
      { status: 500 }
    );
  }
}

// DELETE /api/deals/[id] - Delete a deal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('crm_deals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
