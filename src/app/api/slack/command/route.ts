import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

// POST /api/slack/command - Handle Slack slash commands
// Configure in Slack App: Request URL = https://crm.hummingagent.ai/api/slack/command
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = (formData.get('text') as string || '').trim();
    const command = formData.get('command') as string;

    // Optional: verify Slack signing secret
    // const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (!text) {
      return slackResponse(
        '🤖 *HummingAgent CRM Commands*\n' +
        '• `/crm add <first> <last> <company>` — Add a contact\n' +
        '• `/crm deal <name> <stage>` — Create/update a deal\n' +
        '• `/crm log <deal-name> <note>` — Log an activity\n' +
        '• `/crm status` — Pipeline summary\n' +
        '• `/crm digest` — Trigger daily digest now'
      );
    }

    const parts = text.split(/\s+/);
    const action = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (action) {
      case 'add':
        return await handleAdd(args);
      case 'deal':
        return await handleDeal(args);
      case 'log':
        return await handleLog(args, text);
      case 'status':
        return await handleStatus();
      case 'digest':
        return await handleDigest();
      default:
        return slackResponse(`❌ Unknown command: \`${action}\`. Try \`/crm\` for help.`);
    }
  } catch (error: any) {
    console.error('Slack command error:', error);
    return slackResponse(`❌ Error: ${error.message}`);
  }
}

function slackResponse(text: string, responseType: 'ephemeral' | 'in_channel' = 'ephemeral') {
  return NextResponse.json({
    response_type: responseType,
    text,
  });
}

// /crm add <first> <last> <company>
async function handleAdd(args: string[]): Promise<NextResponse> {
  if (args.length < 1) {
    return slackResponse('Usage: `/crm add <first_name> [last_name] [company_name]`');
  }

  const firstName = args[0];
  const lastName = args.length > 2 ? args[1] : null;
  const companyName = args.length > 2 ? args.slice(2).join(' ') : args.length > 1 ? args.slice(1).join(' ') : null;

  let companyId = null;
  if (companyName) {
    // Try to find existing company
    const { data: existing } = await supabase
      .from('crm_companies')
      .select('id, name')
      .ilike('name', companyName)
      .limit(1)
      .single();

    if (existing) {
      companyId = existing.id;
    } else {
      // Create new company
      const { data: newCompany } = await supabase
        .from('crm_companies')
        .insert({ name: companyName })
        .select('id')
        .single();
      companyId = newCompany?.id;
    }
  }

  const { data: contact, error } = await supabase
    .from('crm_contacts')
    .insert({
      first_name: firstName,
      last_name: lastName,
      company_id: companyId,
      lead_status: 'new',
    })
    .select('id, first_name, last_name')
    .single();

  if (error) throw error;

  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
  return slackResponse(
    `✅ Contact created: *${name}*${companyName ? ` at ${companyName}` : ''}\n<https://crm.hummingagent.ai/contacts|View in CRM>`,
    'in_channel'
  );
}

// /crm deal <name> [stage]
async function handleDeal(args: string[]): Promise<NextResponse> {
  if (args.length < 1) {
    return slackResponse('Usage: `/crm deal <deal_name> [stage]`\nStages: new-lead, discovery-scheduled, discovery-complete, proposal-draft, proposal-sent, contract-sent');
  }

  const validStages = ['new-lead', 'discovery-scheduled', 'discovery-complete', 'proposal-draft', 'proposal-sent', 'contract-sent', 'closed-won', 'closed-lost'];
  
  // Check if last arg is a stage
  const lastArg = args[args.length - 1].toLowerCase();
  const hasStage = validStages.includes(lastArg);
  const stage = hasStage ? lastArg : 'new-lead';
  const dealName = hasStage ? args.slice(0, -1).join(' ') : args.join(' ');

  if (!dealName) {
    return slackResponse('Usage: `/crm deal <deal_name> [stage]`');
  }

  // Check if deal exists
  const { data: existing } = await supabase
    .from('crm_deals')
    .select('id, name, stage')
    .ilike('name', dealName)
    .limit(1)
    .single();

  if (existing) {
    // Update stage
    const { error } = await supabase
      .from('crm_deals')
      .update({ stage, last_activity_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) throw error;

    if (existing.stage !== stage) {
      await supabase.from('crm_activities').insert({
        deal_id: existing.id,
        type: 'stage-change',
        stage_from: existing.stage,
        stage_to: stage,
        subject: `Deal moved from ${existing.stage} to ${stage} via Slack`,
      });
    }

    return slackResponse(
      `✅ Deal updated: *${existing.name}* → _${stage.replace(/-/g, ' ')}_\n<https://crm.hummingagent.ai/deals|View in CRM>`,
      'in_channel'
    );
  }

  // Create new deal
  const { data: deal, error } = await supabase
    .from('crm_deals')
    .insert({ name: dealName, stage })
    .select('id, name, stage')
    .single();

  if (error) throw error;

  await supabase.from('crm_activities').insert({
    deal_id: deal.id,
    type: 'note',
    subject: 'Deal created via Slack',
  });

  return slackResponse(
    `✅ Deal created: *${deal.name}* in _${stage.replace(/-/g, ' ')}_\n<https://crm.hummingagent.ai/deals|View in CRM>`,
    'in_channel'
  );
}

// /crm log <deal-name> <note>
async function handleLog(args: string[], fullText: string): Promise<NextResponse> {
  if (args.length < 2) {
    return slackResponse('Usage: `/crm log <deal_name> <note>`\nTip: Use the deal name (or partial match), then your note.');
  }

  // Try to find deal - first word(s) until we find a match
  let deal = null;
  let noteStart = 1;

  for (let i = args.length - 1; i >= 1; i--) {
    const searchName = args.slice(0, i).join(' ');
    const { data } = await supabase
      .from('crm_deals')
      .select('id, name')
      .ilike('name', `%${searchName}%`)
      .limit(1)
      .single();

    if (data) {
      deal = data;
      noteStart = i;
      break;
    }
  }

  if (!deal) {
    return slackResponse(`❌ Could not find a deal matching "${args[0]}". Try using more of the deal name.`);
  }

  const note = args.slice(noteStart).join(' ');
  if (!note) {
    return slackResponse('❌ Please provide a note after the deal name.');
  }

  const { error } = await supabase.from('crm_activities').insert({
    deal_id: deal.id,
    type: 'note',
    subject: `Slack note`,
    body: note,
  });

  if (error) throw error;

  // Update last_activity_at
  await supabase
    .from('crm_deals')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', deal.id);

  return slackResponse(
    `✅ Note added to *${deal.name}*:\n> ${note}\n<https://crm.hummingagent.ai/deals|View in CRM>`,
    'in_channel'
  );
}

// /crm status
async function handleStatus(): Promise<NextResponse> {
  const { data: deals } = await supabase
    .from('crm_deals')
    .select('stage, amount');

  if (!deals || deals.length === 0) {
    return slackResponse('📊 No deals in the pipeline yet.');
  }

  const stages: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;
  let openCount = 0;

  const closedStages = ['closed-won', 'closed-lost', 'current-customer', 'dead', 'dead-deals'];

  deals.forEach(d => {
    if (!stages[d.stage]) stages[d.stage] = { count: 0, value: 0 };
    stages[d.stage].count++;
    stages[d.stage].value += d.amount || 0;
    if (!closedStages.includes(d.stage)) {
      totalValue += d.amount || 0;
      openCount++;
    }
  });

  const stageOrder = ['new-lead', 'discovery-scheduled', 'discovery-complete', 'proposal-draft', 'proposal-sent', 'contract-sent', 'closed-won', 'closed-lost'];

  const lines = stageOrder
    .filter(s => stages[s])
    .map(s => {
      const data = stages[s];
      const bar = '█'.repeat(Math.min(data.count, 10));
      return `${s.replace(/-/g, ' ')}: ${bar} ${data.count} deals • ${formatCurrency(data.value)}`;
    });

  // Add any stages not in stageOrder
  Object.keys(stages).filter(s => !stageOrder.includes(s)).forEach(s => {
    const data = stages[s];
    lines.push(`${s.replace(/-/g, ' ')}: ${data.count} deals • ${formatCurrency(data.value)}`);
  });

  return slackResponse(
    `📊 *Pipeline Summary*\n\n${lines.join('\n')}\n\n*Open Pipeline:* ${openCount} deals • ${formatCurrency(totalValue)}\n<https://crm.hummingagent.ai/analytics|View Analytics>`,
    'in_channel'
  );
}

// /crm digest - trigger digest now
async function handleDigest(): Promise<NextResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const res = await fetch(`${baseUrl}/api/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const data = await res.json();
      return slackResponse(`❌ Digest failed: ${data.error}`);
    }

    return slackResponse('✅ Daily digest sent to the configured Slack channel!');
  } catch (error: any) {
    return slackResponse(`❌ Error sending digest: ${error.message}`);
  }
}
