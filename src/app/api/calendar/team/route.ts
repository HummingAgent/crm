import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: List team members with connection status
export async function GET() {
  try {
    const { data: members, error } = await supabase
      .from('crm_team_members')
      .select(`
        *,
        calendar_connections:crm_calendar_connections(
          id,
          google_email,
          sync_enabled,
          last_synced_at,
          sync_error
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to load team' }, { status: 500 });
    }

    // Transform to include connection status
    const team = members?.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      avatarUrl: member.avatar_url,
      color: member.color,
      role: member.role,
      isConnected: member.calendar_connections?.length > 0,
      connection: member.calendar_connections?.[0] || null,
    }));

    return NextResponse.json({ team });
  } catch (err) {
    console.error('Team fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

// POST: Add a new team member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, color } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('crm_team_members')
      .insert({
        name,
        email,
        color: color || '#8b5cf6',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Team member with this email already exists' }, { status: 400 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }

    return NextResponse.json({ member: data });
  } catch (err) {
    console.error('Team create error:', err);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}
