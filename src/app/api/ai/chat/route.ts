import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getCRMContext() {
  // Fetch pipeline summary
  const { data: deals } = await supabase
    .from('crm_deals')
    .select('id, name, amount, stage, priority, close_date, created_at, last_activity_at, close_reason, company:crm_companies(name), contact:crm_contacts(first_name, last_name)')
    .order('created_at', { ascending: false });

  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id, first_name, last_name, email, title, lead_status, company:crm_companies(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: companies } = await supabase
    .from('crm_companies')
    .select('id, name, industry, website')
    .order('created_at', { ascending: false });

  // Build summary stats
  const openDeals = deals?.filter(d => !['closed-won', 'closed-lost', 'dead'].includes(d.stage)) || [];
  const wonDeals = deals?.filter(d => d.stage === 'closed-won') || [];
  const lostDeals = deals?.filter(d => d.stage === 'closed-lost') || [];

  const totalPipeline = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  const stageBreakdown: Record<string, { count: number; value: number }> = {};
  openDeals.forEach(d => {
    if (!stageBreakdown[d.stage]) stageBreakdown[d.stage] = { count: 0, value: 0 };
    stageBreakdown[d.stage].count++;
    stageBreakdown[d.stage].value += d.amount || 0;
  });

  return `
## CRM Data Summary (as of ${new Date().toISOString()})

### Pipeline Overview
- Total open deals: ${openDeals.length}
- Total pipeline value: $${totalPipeline.toLocaleString()}
- Won deals: ${wonDeals.length} ($${wonValue.toLocaleString()})
- Lost deals: ${lostDeals.length}
- Total contacts: ${contacts?.length || 0}+
- Total companies: ${companies?.length || 0}

### Pipeline by Stage
${Object.entries(stageBreakdown).map(([stage, data]) => 
  `- ${stage}: ${data.count} deals, $${data.value.toLocaleString()}`
).join('\n')}

### All Deals
${(deals || []).map(d => {
  const company = Array.isArray(d.company) ? d.company[0] : d.company;
  const contact = Array.isArray(d.contact) ? d.contact[0] : d.contact;
  return `- "${d.name}" | Stage: ${d.stage} | Amount: $${(d.amount || 0).toLocaleString()} | Company: ${company?.name || 'N/A'} | Contact: ${contact ? `${contact.first_name} ${contact.last_name || ''}` : 'N/A'} | Priority: ${d.priority || 'N/A'} | Close: ${d.close_date || 'N/A'}`;
}).join('\n')}

### Recent Contacts
${(contacts || []).slice(0, 20).map(c => {
  const company = Array.isArray(c.company) ? c.company[0] : c.company;
  return `- ${c.first_name} ${c.last_name || ''} | ${c.email || 'no email'} | ${c.title || ''} | ${company?.name || 'N/A'} | Status: ${c.lead_status || 'unknown'}`;
}).join('\n')}

### Companies
${(companies || []).map(c => `- ${c.name} | ${c.industry || 'N/A'} | ${c.website || ''}`).join('\n')}
`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const crmContext = await getCRMContext();

    const systemMessage = `You are an AI CRM assistant for HummingAgent. You have access to the full CRM database.
Answer questions about deals, contacts, companies, pipeline metrics, and provide sales insights.
Be concise, specific, and actionable. Use data from the CRM to back up your answers.
Format responses with markdown when helpful. Use dollar amounts and percentages.
If asked about something not in the data, say so clearly.

${crmContext}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    return NextResponse.json({
      message: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: error.message || 'AI chat failed' },
      { status: 500 }
    );
  }
}
