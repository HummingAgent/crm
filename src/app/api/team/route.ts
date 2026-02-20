import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/team - List team members
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('crm_team_members')
      .select('id, name, email, color, avatar_url, role')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ team: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
