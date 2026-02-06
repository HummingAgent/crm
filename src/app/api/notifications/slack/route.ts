import { NextResponse } from 'next/server';

// Slack webhook URL - set in Vercel env vars
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface SlackNotification {
  type: 'deal-created' | 'deal-stage-change' | 'deal-won' | 'deal-lost' | 'contact-created' | 'company-created';
  dealName?: string;
  dealAmount?: number;
  companyName?: string;
  contactName?: string;
  stageTo?: string;
  stageFrom?: string;
  userName?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function buildSlackMessage(notification: SlackNotification) {
  const { type, dealName, dealAmount, companyName, contactName, stageTo, stageFrom, userName } = notification;

  let emoji = '📋';
  let text = '';
  let color = '#8b5cf6'; // violet default

  switch (type) {
    case 'deal-created':
      emoji = '🆕';
      text = `*New Deal Created*\n*${dealName}*${companyName ? ` • ${companyName}` : ''}${dealAmount ? `\nValue: ${formatCurrency(dealAmount)}` : ''}`;
      color = '#8b5cf6';
      break;

    case 'deal-stage-change':
      emoji = '➡️';
      text = `*Deal Moved*\n*${dealName}*\n${stageFrom} → *${stageTo}*`;
      color = '#3b82f6';
      break;

    case 'deal-won':
      emoji = '🎉';
      text = `*Deal Won!* 🏆\n*${dealName}*${companyName ? ` • ${companyName}` : ''}${dealAmount ? `\n💰 ${formatCurrency(dealAmount)}` : ''}`;
      color = '#22c55e';
      break;

    case 'deal-lost':
      emoji = '😔';
      text = `*Deal Lost*\n*${dealName}*${companyName ? ` • ${companyName}` : ''}`;
      color = '#ef4444';
      break;

    case 'contact-created':
      emoji = '👤';
      text = `*New Contact*\n*${contactName}*${companyName ? ` • ${companyName}` : ''}`;
      color = '#06b6d4';
      break;

    case 'company-created':
      emoji = '🏢';
      text = `*New Company*\n*${companyName}*`;
      color = '#f59e0b';
      break;
  }

  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} ${text}`,
        },
      },
    ],
    attachments: [
      {
        color,
        footer: 'HummingAgent CRM',
        footer_icon: 'https://crm.hummingagent.ai/favicon.ico',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

export async function POST(request: Request) {
  try {
    if (!SLACK_WEBHOOK_URL) {
      return NextResponse.json(
        { error: 'Slack webhook not configured' },
        { status: 500 }
      );
    }

    const notification: SlackNotification = await request.json();
    const slackMessage = buildSlackMessage(notification);

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Slack notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
