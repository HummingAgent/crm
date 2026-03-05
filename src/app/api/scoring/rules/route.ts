import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/scoring/rules
 * List all scoring rules
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('crm_scoring_rules')
      .select('*')
      .order('category', { ascending: true })
      .order('points', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: rules, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Failed to fetch scoring rules:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scoring rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scoring/rules
 * Create or update a scoring rule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { id, name, category, conditions, points, is_active } = body;

    if (!name || !category || !conditions || points === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['engagement', 'fit', 'behavior'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    let result;

    if (id) {
      // Update existing rule
      const { data, error } = await supabase
        .from('crm_scoring_rules')
        .update({
          name,
          category,
          conditions,
          points,
          is_active: is_active ?? true,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new rule
      const { data, error } = await supabase
        .from('crm_scoring_rules')
        .insert({
          name,
          category,
          conditions,
          points,
          is_active: is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ rule: result });
  } catch (error: any) {
    console.error('Failed to save scoring rule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save scoring rule' },
      { status: 500 }
    );
  }
}
