import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface ScoringRule {
  id: string;
  name: string;
  category: string;
  field: string;
  operator: string;
  value: string | null;
  points: number;
}

interface ScoreBreakdown {
  rules: { name: string; points: number }[];
  total: number;
  calculated_at: string;
}

// Calculate score for a single contact
async function calculateContactScore(
  supabase: ReturnType<typeof createAdminClient>,
  contactId: string,
  rules: ScoringRule[]
): Promise<{ score: number; breakdown: ScoreBreakdown }> {
  // Fetch contact with company and deals
  const { data: contact } = await supabase
    .from('crm_contacts')
    .select(`
      *,
      company:crm_companies(*),
      deals:crm_deal_contacts(deal:crm_deals(*))
    `)
    .eq('id', contactId)
    .single();

  if (!contact) {
    return { score: 0, breakdown: { rules: [], total: 0, calculated_at: new Date().toISOString() } };
  }

  // Get recent activity count
  const { count: activityCount } = await supabase
    .from('crm_activities')
    .select('*', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Calculate days since last activity
  const lastActivityDays = contact.last_activity_at 
    ? Math.floor((Date.now() - new Date(contact.last_activity_at).getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  // Check if has active deal and max deal amount
  const deals = (contact.deals as { deal: { stage: string; amount: number | null } }[] || [])
    .map((d: { deal: { stage: string; amount: number | null } }) => d.deal);
  const hasActiveDeal = deals.some((d: { stage: string }) => !d.stage.includes('closed') && !d.stage.includes('dead'));
  const maxDealAmount = Math.max(0, ...deals.map((d: { amount: number | null }) => d.amount || 0));

  const appliedRules: { name: string; points: number }[] = [];
  let totalScore = 0;

  for (const rule of rules) {
    let matches = false;
    let fieldValue: string | number | boolean | null = null;

    // Map field to actual data
    switch (rule.field) {
      case 'job_title':
        fieldValue = contact.job_title;
        break;
      case 'email':
        fieldValue = contact.email;
        break;
      case 'phone':
        fieldValue = contact.phone;
        break;
      case 'linkedin_url':
        fieldValue = contact.linkedin_url;
        break;
      case 'company_id':
        fieldValue = contact.company_id;
        break;
      case 'lead_source':
        fieldValue = contact.lead_source;
        break;
      case 'last_activity_days':
        fieldValue = lastActivityDays;
        break;
      case 'has_deal':
        fieldValue = hasActiveDeal ? 'true' : 'false';
        break;
      case 'deal_amount':
        fieldValue = maxDealAmount;
        break;
      case 'activity_count':
        fieldValue = activityCount || 0;
        break;
    }

    // Apply operator
    switch (rule.operator) {
      case 'exists':
        matches = fieldValue !== null && fieldValue !== '' && fieldValue !== undefined;
        break;
      case 'equals':
        matches = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase();
        break;
      case 'contains':
        if (typeof fieldValue === 'string' && rule.value) {
          const terms = rule.value.split(',').map(t => t.trim().toLowerCase());
          matches = terms.some(term => fieldValue!.toLowerCase().includes(term));
        }
        break;
      case 'greater_than':
        matches = Number(fieldValue) > Number(rule.value);
        break;
      case 'less_than':
        matches = Number(fieldValue) < Number(rule.value);
        break;
    }

    if (matches) {
      appliedRules.push({ name: rule.name, points: rule.points });
      totalScore += rule.points;
    }
  }

  return {
    score: totalScore,
    breakdown: {
      rules: appliedRules,
      total: totalScore,
      calculated_at: new Date().toISOString(),
    },
  };
}

// Calculate score for a single deal
async function calculateDealScore(
  supabase: ReturnType<typeof createAdminClient>,
  dealId: string,
  rules: ScoringRule[]
): Promise<{ score: number; breakdown: ScoreBreakdown }> {
  // Fetch deal with contact
  const { data: deal } = await supabase
    .from('crm_deals')
    .select(`
      *,
      contact:crm_contacts(*)
    `)
    .eq('id', dealId)
    .single();

  if (!deal) {
    return { score: 0, breakdown: { rules: [], total: 0, calculated_at: new Date().toISOString() } };
  }

  // Get recent activity count
  const { count: activityCount } = await supabase
    .from('crm_activities')
    .select('*', { count: 'exact', head: true })
    .eq('deal_id', dealId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const lastActivityDays = deal.last_activity_at 
    ? Math.floor((Date.now() - new Date(deal.last_activity_at).getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  const appliedRules: { name: string; points: number }[] = [];
  let totalScore = 0;

  // Also score based on contact if present
  if (deal.contact) {
    const contact = deal.contact as { job_title?: string; email?: string; phone?: string; linkedin_url?: string; company_id?: string };
    
    for (const rule of rules) {
      if (rule.category !== 'demographic') continue;
      
      let matches = false;
      let fieldValue: string | null = null;

      switch (rule.field) {
        case 'job_title':
          fieldValue = contact.job_title || null;
          break;
        case 'email':
          fieldValue = contact.email || null;
          break;
        case 'phone':
          fieldValue = contact.phone || null;
          break;
        case 'linkedin_url':
          fieldValue = contact.linkedin_url || null;
          break;
        case 'company_id':
          fieldValue = contact.company_id || null;
          break;
      }

      switch (rule.operator) {
        case 'exists':
          matches = fieldValue !== null && fieldValue !== '';
          break;
        case 'contains':
          if (typeof fieldValue === 'string' && rule.value) {
            const terms = rule.value.split(',').map(t => t.trim().toLowerCase());
            matches = terms.some(term => fieldValue!.toLowerCase().includes(term));
          }
          break;
      }

      if (matches) {
        appliedRules.push({ name: rule.name, points: rule.points });
        totalScore += rule.points;
      }
    }
  }

  // Score deal-specific fields
  for (const rule of rules) {
    if (rule.category === 'demographic') continue; // Already handled above
    
    let matches = false;
    let fieldValue: string | number | null = null;

    switch (rule.field) {
      case 'lead_source':
        fieldValue = deal.lead_source;
        break;
      case 'last_activity_days':
        fieldValue = lastActivityDays;
        break;
      case 'deal_amount':
        fieldValue = deal.amount || 0;
        break;
      case 'activity_count':
        fieldValue = activityCount || 0;
        break;
    }

    switch (rule.operator) {
      case 'equals':
        matches = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase();
        break;
      case 'greater_than':
        matches = Number(fieldValue) > Number(rule.value);
        break;
      case 'less_than':
        matches = Number(fieldValue) < Number(rule.value);
        break;
    }

    if (matches) {
      appliedRules.push({ name: rule.name, points: rule.points });
      totalScore += rule.points;
    }
  }

  return {
    score: totalScore,
    breakdown: {
      rules: appliedRules,
      total: totalScore,
      calculated_at: new Date().toISOString(),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { type, ids } = body; // type: 'contact' | 'deal' | 'all', ids: optional array

    // Fetch active scoring rules
    const { data: rules, error: rulesError } = await supabase
      .from('crm_scoring_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      return NextResponse.json({ error: 'Failed to fetch scoring rules' }, { status: 500 });
    }

    const scoringRules = (rules || []) as ScoringRule[];
    const results: { contacts: number; deals: number } = { contacts: 0, deals: 0 };

    if (type === 'contact' || type === 'all') {
      // Get contacts to score
      let contactQuery = supabase.from('crm_contacts').select('id');
      if (ids && ids.length > 0 && type === 'contact') {
        contactQuery = contactQuery.in('id', ids);
      }
      const { data: contacts } = await contactQuery;

      for (const contact of contacts || []) {
        const { score, breakdown } = await calculateContactScore(supabase, contact.id, scoringRules);
        
        await supabase
          .from('crm_contacts')
          .update({
            lead_score: score,
            score_breakdown: breakdown,
            last_scored_at: new Date().toISOString(),
          })
          .eq('id', contact.id);
        
        results.contacts++;
      }
    }

    if (type === 'deal' || type === 'all') {
      // Get deals to score
      let dealQuery = supabase.from('crm_deals').select('id');
      if (ids && ids.length > 0 && type === 'deal') {
        dealQuery = dealQuery.in('id', ids);
      }
      const { data: deals } = await dealQuery;

      for (const deal of deals || []) {
        const { score, breakdown } = await calculateDealScore(supabase, deal.id, scoringRules);
        
        await supabase
          .from('crm_deals')
          .update({
            lead_score: score,
            score_breakdown: breakdown,
            last_scored_at: new Date().toISOString(),
          })
          .eq('id', deal.id);
        
        results.deals++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      scored: results,
      message: `Scored ${results.contacts} contacts and ${results.deals} deals`
    });
  } catch (error) {
    console.error('Scoring error:', error);
    return NextResponse.json({ error: 'Failed to calculate scores' }, { status: 500 });
  }
}

// GET endpoint to fetch score for a specific entity
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'contact' | 'deal'
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  if (type === 'contact') {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('id, lead_score, score_breakdown, last_scored_at')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  }

  if (type === 'deal') {
    const { data, error } = await supabase
      .from('crm_deals')
      .select('id, lead_score, score_breakdown, last_scored_at')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
