import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint receives emails from an external agent (himalaya, etc.)
// and logs them as activities on matching deals

interface EmailPayload {
  from: string;
  from_name?: string;
  to: string;
  subject: string;
  body?: string;
  body_html?: string;
  date: string;
  message_id?: string;
  in_reply_to?: string;
  direction?: 'inbound' | 'outbound';
  // Optional: create contact/deal if not found
  auto_create_contact?: boolean;
  auto_create_lead?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Simple API key auth - check for Bearer token or X-API-Key header
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.CRM_API_KEY;

    if (expectedKey) {
      const providedKey = authHeader?.replace('Bearer ', '') || apiKey;
      if (providedKey !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload: EmailPayload = await request.json();

    if (!payload.from || !payload.subject) {
      return NextResponse.json(
        { error: 'Missing required fields: from, subject' },
        { status: 400 }
      );
    }

    // Use service role for backend operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Determine the email address to look up (inbound = from, outbound = to)
    const direction = payload.direction || 'inbound';
    const contactEmail = direction === 'inbound' 
      ? payload.from.toLowerCase() 
      : payload.to.toLowerCase();

    // Look up contact by email
    let { data: contact } = await supabase
      .from('crm_contacts')
      .select('id, first_name, last_name, company_id')
      .ilike('email', contactEmail)
      .single();

    // Auto-create contact if requested and not found
    if (!contact && payload.auto_create_contact) {
      const emailParts = contactEmail.split('@');
      const nameParts = (payload.from_name || emailParts[0]).split(' ');
      
      const { data: newContact } = await supabase
        .from('crm_contacts')
        .insert({
          email: contactEmail,
          first_name: nameParts[0] || 'Unknown',
          last_name: nameParts.slice(1).join(' ') || null,
        })
        .select()
        .single();

      contact = newContact;
    }

    if (!contact) {
      return NextResponse.json({
        success: false,
        message: 'No matching contact found',
        email: contactEmail,
      });
    }

    // Find deals associated with this contact
    const { data: dealLinks } = await supabase
      .from('crm_deal_contacts')
      .select('deal_id')
      .eq('contact_id', contact.id);

    // Also check deals where this contact is primary
    const { data: primaryDeals } = await supabase
      .from('crm_deals')
      .select('id')
      .eq('primary_contact_id', contact.id);

    // Combine all deal IDs
    const dealIds = new Set<string>();
    dealLinks?.forEach(link => dealIds.add(link.deal_id));
    primaryDeals?.forEach(deal => dealIds.add(deal.id));

    // Log activity on each deal
    const activities = [];
    for (const dealId of dealIds) {
      const { data: activity } = await supabase
        .from('crm_activities')
        .insert({
          deal_id: dealId,
          contact_id: contact.id,
          type: 'email',
          subject: `${direction === 'inbound' ? '📥' : '📤'} ${payload.subject}`,
          body: payload.body || payload.body_html || null,
          metadata: {
            message_id: payload.message_id,
            in_reply_to: payload.in_reply_to,
            from: payload.from,
            to: payload.to,
            date: payload.date,
            direction,
          },
        })
        .select()
        .single();

      if (activity) activities.push(activity);

      // Update last_activity_at on the deal
      await supabase
        .from('crm_deals')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', dealId);
    }

    // Auto-create lead if requested and no deals found
    if (dealIds.size === 0 && payload.auto_create_lead && direction === 'inbound') {
      const { data: newDeal } = await supabase
        .from('crm_deals')
        .insert({
          name: `Lead: ${payload.from_name || contactEmail}`,
          stage: 'new-lead',
          primary_contact_id: contact.id,
          company_id: contact.company_id,
          lead_source: 'email',
          description: `Auto-created from email: ${payload.subject}`,
        })
        .select()
        .single();

      if (newDeal) {
        // Log the email on the new deal
        await supabase.from('crm_activities').insert({
          deal_id: newDeal.id,
          contact_id: contact.id,
          type: 'email',
          subject: `📥 ${payload.subject}`,
          body: payload.body || payload.body_html || null,
        });

        return NextResponse.json({
          success: true,
          message: 'New lead created from email',
          contact_id: contact.id,
          deal_id: newDeal.id,
          activities_logged: 1,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: dealIds.size > 0 
        ? `Email logged to ${dealIds.size} deal(s)` 
        : 'Contact found but no associated deals',
      contact_id: contact.id,
      deals: Array.from(dealIds),
      activities_logged: activities.length,
    });

  } catch (error) {
    console.error('Email ingest error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Email Ingest API',
    usage: {
      method: 'POST',
      body: {
        from: 'sender@example.com (required)',
        from_name: 'Sender Name (optional)',
        to: 'recipient@example.com',
        subject: 'Email subject (required)',
        body: 'Plain text body (optional)',
        body_html: 'HTML body (optional)',
        date: 'ISO date string',
        message_id: 'Email message ID (optional)',
        direction: 'inbound | outbound (default: inbound)',
        auto_create_contact: 'Create contact if not found (default: false)',
        auto_create_lead: 'Create deal if no deals found (default: false)',
      },
      auth: 'Bearer token or X-API-Key header (if CRM_API_KEY env is set)',
    },
  });
}
