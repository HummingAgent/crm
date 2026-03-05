/**
 * Lead Scoring System
 * Calculates lead scores based on engagement, fit, and behavior
 */

import { createClient } from '@/lib/supabase/server';

export interface ScoreBreakdown {
  engagement: number;
  fit: number;
  behavior: number;
  total: number;
  details: Array<{
    rule: string;
    category: string;
    points: number;
    reason: string;
  }>;
}

export interface ScoringRule {
  id: string;
  name: string;
  category: 'engagement' | 'fit' | 'behavior';
  conditions: Record<string, any>;
  points: number;
  is_active: boolean;
}

/**
 * Calculate lead score for a contact
 */
export async function calculateContactScore(contactId: string): Promise<ScoreBreakdown> {
  const supabase = await createClient();

  // Fetch contact with company data
  const { data: contact, error: contactError } = await supabase
    .from('crm_contacts')
    .select(`
      *,
      company:crm_companies(*)
    `)
    .eq('id', contactId)
    .single();

  if (contactError || !contact) {
    throw new Error(`Failed to fetch contact: ${contactError?.message}`);
  }

  // Fetch recent activities
  const { data: activities } = await supabase
    .from('crm_activities')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch scoring rules
  const { data: rules } = await supabase
    .from('crm_scoring_rules')
    .select('*')
    .eq('is_active', true);

  if (!rules) {
    return { engagement: 0, fit: 0, behavior: 0, total: 0, details: [] };
  }

  // Calculate score
  const breakdown: ScoreBreakdown = {
    engagement: 0,
    fit: 0,
    behavior: 0,
    total: 0,
    details: [],
  };

  for (const rule of rules as ScoringRule[]) {
    const result = evaluateRule(rule, contact, activities || []);
    if (result.matches) {
      breakdown[rule.category] += rule.points;
      breakdown.details.push({
        rule: rule.name,
        category: rule.category,
        points: rule.points,
        reason: result.reason || rule.name,
      });
    }
  }

  breakdown.total = breakdown.engagement + breakdown.fit + breakdown.behavior;

  // Update contact score
  await supabase
    .from('crm_contacts')
    .update({
      lead_score: breakdown.total,
      score_breakdown: breakdown,
      score_updated_at: new Date().toISOString(),
    })
    .eq('id', contactId);

  return breakdown;
}

/**
 * Calculate lead score for a deal
 */
export async function calculateDealScore(dealId: string): Promise<ScoreBreakdown> {
  const supabase = await createClient();

  // Fetch deal with company and contacts
  const { data: deal, error: dealError } = await supabase
    .from('crm_deals')
    .select(`
      *,
      company:crm_companies(*),
      deal_contacts:crm_deal_contacts(
        contact:crm_contacts(*)
      )
    `)
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    throw new Error(`Failed to fetch deal: ${dealError?.message}`);
  }

  // Fetch recent activities
  const { data: activities } = await supabase
    .from('crm_activities')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch scoring rules
  const { data: rules } = await supabase
    .from('crm_scoring_rules')
    .select('*')
    .eq('is_active', true);

  if (!rules) {
    return { engagement: 0, fit: 0, behavior: 0, total: 0, details: [] };
  }

  // Calculate score
  const breakdown: ScoreBreakdown = {
    engagement: 0,
    fit: 0,
    behavior: 0,
    total: 0,
    details: [],
  };

  for (const rule of rules as ScoringRule[]) {
    const result = evaluateRule(rule, deal, activities || []);
    if (result.matches) {
      breakdown[rule.category] += rule.points;
      breakdown.details.push({
        rule: rule.name,
        category: rule.category,
        points: rule.points,
        reason: result.reason || rule.name,
      });
    }
  }

  breakdown.total = breakdown.engagement + breakdown.fit + breakdown.behavior;

  // Update deal score
  await supabase
    .from('crm_deals')
    .update({
      lead_score: breakdown.total,
      score_breakdown: breakdown,
    })
    .eq('id', dealId);

  return breakdown;
}

/**
 * Evaluate a scoring rule against contact/deal data
 */
function evaluateRule(
  rule: ScoringRule,
  record: any,
  activities: any[]
): { matches: boolean; reason?: string } {
  const { conditions } = rule;

  switch (conditions.condition) {
    // Engagement rules
    case 'email_opened':
    case 'recent_activity': {
      const days = conditions.days || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const recentActivities = activities.filter(
        (a) => new Date(a.created_at) >= cutoff
      );

      if (recentActivities.length > 0) {
        return {
          matches: true,
          reason: `${recentActivities.length} activities in last ${days} days`,
        };
      }
      return { matches: false };
    }

    case 'email_reply': {
      const hasReply = activities.some(
        (a) => a.type === 'email' && a.email_direction === 'inbound'
      );
      return { matches: hasReply, reason: 'Email reply received' };
    }

    case 'meeting_attended': {
      const hasMeeting = activities.some((a) => a.type === 'meeting');
      return { matches: hasMeeting, reason: 'Meeting attended' };
    }

    // Fit rules
    case 'company_size': {
      const companySize = record.company?.company_size || record.company_size;
      const matches = companySize === conditions.value;
      return { matches, reason: matches ? `Company size: ${companySize}` : undefined };
    }

    case 'job_title': {
      const jobTitle = record.job_title || '';
      const keywords = conditions.keywords || [];
      const matches = keywords.some((keyword: string) =>
        jobTitle.toLowerCase().includes(keyword.toLowerCase())
      );
      return { matches, reason: matches ? `Job title: ${jobTitle}` : undefined };
    }

    case 'industry': {
      const industry = record.company?.industry || record.industry;
      const values = conditions.values || [];
      const matches = values.includes(industry);
      return { matches, reason: matches ? `Industry: ${industry}` : undefined };
    }

    // Behavior rules
    case 'demo_requested': {
      const hasDemo = activities.some(
        (a) => a.type === 'meeting' && a.subject?.toLowerCase().includes('demo')
      );
      return { matches: hasDemo, reason: 'Demo requested' };
    }

    case 'lead_source': {
      const leadSource = record.lead_source;
      const matches = leadSource === conditions.value;
      return { matches, reason: matches ? `Lead source: ${leadSource}` : undefined };
    }

    case 'website_visit': {
      const hasVisit = activities.some((a) => a.type === 'website_visit');
      return { matches: hasVisit, reason: 'Website visit tracked' };
    }

    default:
      return { matches: false };
  }
}

/**
 * Get score color based on total score
 */
export function getScoreColor(score: number): string {
  if (score >= 61) return 'green';
  if (score >= 31) return 'yellow';
  return 'red';
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 61) return 'Hot';
  if (score >= 31) return 'Warm';
  return 'Cold';
}

/**
 * Recalculate all contact scores (for cron job)
 */
export async function recalculateAllContactScores(): Promise<{
  success: number;
  failed: number;
}> {
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id')
    .limit(1000); // Process in batches

  if (!contacts) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      await calculateContactScore(contact.id);
      success++;
    } catch (error) {
      console.error(`Failed to score contact ${contact.id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Recalculate all deal scores (for cron job)
 */
export async function recalculateAllDealScores(): Promise<{
  success: number;
  failed: number;
}> {
  const supabase = await createClient();

  const { data: deals } = await supabase
    .from('crm_deals')
    .select('id')
    .not('stage', 'in', '("closed-won","closed-lost","dead","current-customer")')
    .limit(1000); // Process in batches

  if (!deals) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const deal of deals) {
    try {
      await calculateDealScore(deal.id);
      success++;
    } catch (error) {
      console.error(`Failed to score deal ${deal.id}:`, error);
      failed++;
    }
  }

  return { success, failed };
}
