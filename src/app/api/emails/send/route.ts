import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailPayload {
  to: string | string[];
  subject: string;
  body: string;
  body_html?: string;
  from?: string;
  from_name?: string;
  reply_to?: string;
  // Optional: log to deal
  deal_id?: string;
  contact_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: SendEmailPayload = await request.json();

    if (!payload.to || !payload.subject || !payload.body) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Default from address - update this to your verified domain
    const fromAddress = payload.from || 'crm@hummingagent.ai';
    const fromName = payload.from_name || 'HummingAgent';

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      text: payload.body,
      html: payload.body_html || payload.body.replace(/\n/g, '<br>'),
      replyTo: payload.reply_to,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    // Log to deal if deal_id provided
    if (payload.deal_id) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await supabase.from('crm_activities').insert({
        deal_id: payload.deal_id,
        contact_id: payload.contact_id,
        type: 'email',
        subject: `📤 ${payload.subject}`,
        body: payload.body,
        metadata: {
          resend_id: data?.id,
          to: payload.to,
          from: fromAddress,
          direction: 'outbound',
        },
      });

      // Update deal last_activity_at
      await supabase
        .from('crm_deals')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', payload.deal_id);
    }

    return NextResponse.json({
      success: true,
      message_id: data?.id,
    });

  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
