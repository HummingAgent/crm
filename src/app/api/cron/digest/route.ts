import { NextResponse } from 'next/server';

// GET /api/cron/digest - Trigger daily digest (call from cron/Vercel cron)
// Vercel cron config: add to vercel.json:
// { "crons": [{ "path": "/api/cron/digest", "schedule": "0 15 * * 1-5" }] }
export async function GET(request: Request) {
  try {
    // Verify cron secret if set (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the digest endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Digest failed');
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Cron digest error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to run digest cron' },
      { status: 500 }
    );
  }
}
