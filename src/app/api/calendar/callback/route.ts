import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

function getGoogleCredentials() {
  return {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
    redirectUri: process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
      : 'http://localhost:3000/api/calendar/callback',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const teamMemberId = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/calendar?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !teamMemberId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/calendar?error=missing_params`
    );
  }

  try {
    const { clientId, clientSecret, redirectUri } = getGoogleCredentials();
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error('Token exchange failed:', err);
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const userInfo = await userInfoResponse.json();

    // Store connection in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: dbError } = await getAdminClient()
      .from('crm_calendar_connections')
      .upsert({
        team_member_id: teamMemberId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        google_email: userInfo.email,
        google_calendar_id: 'primary',
        sync_enabled: true,
        last_synced_at: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'team_member_id,google_calendar_id',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save connection');
    }

    // Redirect back to calendar page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/calendar?connected=true`
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/calendar?error=connection_failed`
    );
  }
}
// Build trigger Wed Mar  4 20:28:35 MST 2026
