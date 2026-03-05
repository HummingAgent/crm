import { getAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';


// GET /api/settings - Get all settings
export async function GET() {
  const supabase = getAdminClient();
  try {
    const { data, error } = await supabase
      .from('crm_settings')
      .select('key, value');

    if (error) throw error;

    const settings: Record<string, any> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update settings
export async function POST(request: Request) {
  const supabase = getAdminClient();
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('crm_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
