import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CalendarConnection {
  id: string;
  team_member_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  google_email: string;
  google_calendar_id: string;
  sync_enabled: boolean;
  team_member: {
    id: string;
    name: string;
    email: string;
    color: string;
  };
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  organizer?: { email: string };
  status?: string;
  hangoutLink?: string;
  conferenceData?: Record<string, unknown>;
}

async function refreshTokenIfNeeded(connection: CalendarConnection): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  
  // If token is still valid (with 5 min buffer), return it
  if (expiresAt && expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return connection.access_token;
  }

  // Need to refresh
  if (!connection.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Token refresh failed:', err);
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Update token in database
  await supabase
    .from('crm_calendar_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  return tokens.access_token;
}

async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleEvent[]> {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Google Calendar API error:', err);
    throw new Error('Failed to fetch events');
  }

  const data = await response.json();
  return data.items || [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const teamMemberIds = searchParams.get('teamMemberIds')?.split(',').filter(Boolean);

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
  }

  try {
    // Get all active calendar connections
    let query = supabase
      .from('crm_calendar_connections')
      .select(`
        *,
        team_member:crm_team_members(id, name, email, color)
      `)
      .eq('sync_enabled', true);

    if (teamMemberIds && teamMemberIds.length > 0) {
      query = query.in('team_member_id', teamMemberIds);
    }

    const { data: connections, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ events: [], message: 'No calendars connected' });
    }

    // Fetch events from all connected calendars in parallel
    const allEvents = await Promise.all(
      connections.map(async (conn: CalendarConnection) => {
        try {
          const accessToken = await refreshTokenIfNeeded(conn);
          const googleEvents = await fetchGoogleEvents(
            accessToken,
            conn.google_calendar_id,
            new Date(startDate).toISOString(),
            new Date(endDate).toISOString()
          );

          // Transform to our format
          return googleEvents.map((event) => ({
            id: `${conn.id}_${event.id}`,
            googleEventId: event.id,
            teamMemberId: conn.team_member_id,
            teamMemberName: conn.team_member?.name || 'Unknown',
            teamMemberColor: conn.team_member?.color || '#8b5cf6',
            title: event.summary || '(No title)',
            description: event.description,
            location: event.location,
            startTime: event.start?.dateTime || event.start?.date,
            endTime: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime,
            timezone: event.start?.timeZone,
            attendees: event.attendees,
            organizerEmail: event.organizer?.email,
            status: event.status,
            hangoutLink: event.hangoutLink,
            conferenceData: event.conferenceData,
          }));
        } catch (err) {
          console.error(`Failed to fetch events for ${conn.google_email}:`, err);
          // Update connection with error
          await supabase
            .from('crm_calendar_connections')
            .update({ 
              sync_error: err instanceof Error ? err.message : 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', conn.id);
          return [];
        }
      })
    );

    // Flatten and sort by start time
    const events = allEvents
      .flat()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json({ events });
  } catch (err) {
    console.error('Calendar events error:', err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
