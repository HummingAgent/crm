import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role for API access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/deals - List deals with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    let query = supabase
      .from('crm_deals')
      .select(`
        *,
        company:crm_companies(id, name, domain, logo_url),
        contact:crm_contacts(id, first_name, last_name, email)
      `);

    // Filter by stage
    const stage = searchParams.get('stage');
    if (stage) {
      query = query.eq('stage', stage);
    }

    // Filter by company
    const companyId = searchParams.get('company_id');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // Filter by priority
    const priority = searchParams.get('priority');
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Filter by lead source
    const leadSource = searchParams.get('lead_source');
    if (leadSource) {
      query = query.eq('lead_source', leadSource);
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    query = query.range(offset, offset + limit - 1);

    // Sort
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') === 'asc' ? true : false;
    query = query.order(sortBy, { ascending: sortOrder });

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      deals: data,
      count: data?.length || 0,
      offset,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST /api/deals - Create a new deal
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('crm_deals')
      .insert({
        name: body.name,
        description: body.description,
        stage: body.stage || 'new-lead',
        amount: body.amount,
        expected_close_date: body.expected_close_date,
        company_id: body.company_id,
        primary_contact_id: body.primary_contact_id,
        priority: body.priority || 'medium',
        lead_source: body.lead_source,
      })
      .select(`
        *,
        company:crm_companies(id, name, domain, logo_url),
        contact:crm_contacts(id, first_name, last_name, email)
      `)
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('crm_activities').insert({
      deal_id: data.id,
      type: 'note',
      subject: 'Deal created via API',
    });

    return NextResponse.json({ deal: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create deal' },
      { status: 500 }
    );
  }
}
