import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/companies - List companies
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    let query = supabase.from('crm_companies').select('*');

    // Filter by industry
    const industry = searchParams.get('industry');
    if (industry) {
      query = query.eq('industry', industry);
    }

    // Search by domain
    const domain = searchParams.get('domain');
    if (domain) {
      query = query.ilike('domain', `%${domain}%`);
    }

    // Search by name
    const name = searchParams.get('name');
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    query = query.range(offset, offset + limit - 1);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      companies: data,
      count: data?.length || 0,
      offset,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

// POST /api/companies - Create a company
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('crm_companies')
      .insert({
        name: body.name,
        domain: body.domain,
        industry: body.industry,
        size: body.size,
        website: body.website,
        linkedin_url: body.linkedin_url,
        location: body.location,
        description: body.description,
        logo_url: body.logo_url,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ company: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create company' },
      { status: 500 }
    );
  }
}
