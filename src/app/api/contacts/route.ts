import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/contacts - List contacts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    let query = supabase
      .from('crm_contacts')
      .select(`
        *,
        company:crm_companies(id, name, logo_url)
      `);

    // Filter by company
    const companyId = searchParams.get('company_id');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    // Filter by lead status
    const leadStatus = searchParams.get('lead_status');
    if (leadStatus) {
      query = query.eq('lead_status', leadStatus);
    }

    // Search by email
    const email = searchParams.get('email');
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    query = query.range(offset, offset + limit - 1);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      contacts: data,
      count: data?.length || 0,
      offset,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a contact
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('crm_contacts')
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        mobile: body.mobile,
        job_title: body.job_title || body.title, // Support both for backwards compat
        department: body.department,
        company_id: body.company_id,
        linkedin_url: body.linkedin_url,
        twitter_handle: body.twitter_handle,
        status: body.status || 'active',
        lead_source: body.lead_source,
      })
      .select(`
        *,
        company:crm_companies(id, name, logo_url)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create contact' },
      { status: 500 }
    );
  }
}
