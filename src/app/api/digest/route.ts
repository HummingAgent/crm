import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEFAULT_STALE_THRESHOLDS: Record<string, number> = {
  'new-lead': 2,
  'discovery-scheduled': 3,
  'discovery-complete': 5,
  'proposal-draft': 3,
  'proposal-sent': 3,
  'contract-sent': 5,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export async function POST(request: Request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Load settings
    const { data: settingsData } = await supabase
      .from('crm_settings')
      .select('key, value')
      .in('key', ['stale_thresholds', 'slack_webhook_url']);

    const settings: Record<string, any> = {};
    for (const row of settingsData || []) {
      settings[row.key] = row.value;
    }

    const webhookUrl = settings.slack_webhook_url || process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: 'No Slack webhook configured' }, { status: 400 });
    }

    const staleThresholds = settings.stale_thresholds || DEFAULT_STALE_THRESHOLDS;

    // Load all open deals
    const { data: deals } = await supabase
      .from('crm_deals')
      .select(`
        id, name, stage, amount, next_action, next_action_date, next_action_type,
        last_activity_at, created_at,
        company:crm_companies(name)
      `)
      .not('stage', 'in', '("closed-won","closed-lost","current-customer","dead","dead-deals")');

    if (!deals || deals.length === 0) {
      return NextResponse.json({ message: 'No open deals found' });
    }

    // 1. Overdue follow-ups (next_action_date < today)
    const overdueDeals = deals.filter(d => 
      d.next_action_date && new Date(d.next_action_date) < today
    ).sort((a, b) => new Date(a.next_action_date!).getTime() - new Date(b.next_action_date!).getTime());

    // 2. Stale deals (no activity in X days per stage)
    const staleDeals = deals.filter(d => {
      const threshold = staleThresholds[d.stage];
      if (!threshold) return false;
      const lastActivity = d.last_activity_at || d.created_at;
      const daysSince = Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= threshold;
    }).map(d => {
      const lastActivity = d.last_activity_at || d.created_at;
      const daysSince = Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      return { ...d, daysSince };
    }).sort((a, b) => b.daysSince - a.daysSince);

    // 3. Today's actions (next_action_date = today)
    const todayActions = deals.filter(d => 
      d.next_action_date && d.next_action_date === todayStr
    );

    // Build Slack message
    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 Daily CRM Digest', emoji: true },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}*` }
        ],
      },
      { type: 'divider' },
    ];

    // Overdue section
    if (overdueDeals.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🔥 *Overdue Follow-ups* (${overdueDeals.length})`,
        },
      });
      const overdueLines = overdueDeals.slice(0, 10).map(d => {
        const companyName = (d.company as any)?.name;
        const amount = d.amount ? ` • ${formatCurrency(d.amount)}` : '';
        const action = d.next_action ? ` — _${d.next_action}_` : '';
        const dueDate = d.next_action_date ? ` (due ${formatDate(d.next_action_date)})` : '';
        return `• *${d.name}*${companyName ? ` (${companyName})` : ''}${amount}${action}${dueDate}`;
      }).join('\n');
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: overdueLines } });
      blocks.push({ type: 'divider' });
    }

    // Stale deals section
    if (staleDeals.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *Stale Deals* (${staleDeals.length})`,
        },
      });
      const staleLines = staleDeals.slice(0, 10).map(d => {
        const companyName = (d.company as any)?.name;
        const amount = d.amount ? ` • ${formatCurrency(d.amount)}` : '';
        const stage = d.stage.replace(/-/g, ' ');
        return `• *${d.name}*${companyName ? ` (${companyName})` : ''}${amount} — _${stage}_ — ${d.daysSince}d idle`;
      }).join('\n');
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: staleLines } });
      blocks.push({ type: 'divider' });
    }

    // Today's actions section
    if (todayActions.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📋 *Today's Actions* (${todayActions.length})`,
        },
      });
      const actionLines = todayActions.slice(0, 10).map(d => {
        const companyName = (d.company as any)?.name;
        const actionType = d.next_action_type ? `[${d.next_action_type}] ` : '';
        const action = d.next_action || 'Follow up';
        return `• ${actionType}*${d.name}*${companyName ? ` (${companyName})` : ''} — ${action}`;
      }).join('\n');
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: actionLines } });
    }

    // Summary footer
    if (overdueDeals.length === 0 && staleDeals.length === 0 && todayActions.length === 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: '✅ All clear! No overdue items, stale deals, or actions due today.' },
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `<https://crm.hummingagent.ai|Open CRM> • ${deals.length} open deals` }
      ],
    });

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      summary: {
        overdue: overdueDeals.length,
        stale: staleDeals.length,
        todayActions: todayActions.length,
        totalOpen: deals.length,
      },
    });
  } catch (error: any) {
    console.error('Digest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send digest' },
      { status: 500 }
    );
  }
}
