import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';


// GET /api/team - List team members
export async function GET() {
  const supabase = getAdminClient();
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
