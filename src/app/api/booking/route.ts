import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Public booking page API - creates booking links and handles scheduling
// Replaces Calendly with branded scheduling

interface BookingSlot {
  start: string; // ISO datetime
  end: string;
  available: boolean;
}

interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  team_member_id: string | null;
  calendar_id: string | null;
  buffer_before: number;
  buffer_after: number;
  min_notice_hours: number;
  max_days_ahead: number;
  available_days: number[]; // 0-6 (Sun-Sat)
  available_hours: { start: string; end: string }; // "09:00", "17:00"
  questions: { id: string; label: string; required: boolean; type: string }[];
  is_active: boolean;
  created_at: string;
}

// GET: Get booking link details or available slots
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const date = searchParams.get('date'); // YYYY-MM-DD for slots
  const linkId = searchParams.get('id');

  const supabase = createAdminClient();

  // Get booking link by slug or id
  if (slug || linkId) {
    const query = supabase
      .from('crm_booking_links')
      .select(`
        *,
        team_member:crm_team_members(id, name, email, avatar_url)
      `);

    if (slug) {
      query.eq('slug', slug);
    } else if (linkId) {
      query.eq('id', linkId);
    }

    const { data: link, error } = await query.eq('is_active', true).single();

    if (error || !link) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 });
    }

    // If date provided, also return available slots
    if (date) {
      const slots = await getAvailableSlots(supabase, link as BookingLink, date);
      return NextResponse.json({ link, slots });
    }

    return NextResponse.json({ link });
  }

  // List all active booking links
  const { data: links, error } = await supabase
    .from('crm_booking_links')
    .select(`
      *,
      team_member:crm_team_members(id, name, email, avatar_url)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ links });
}

// POST: Create booking link or book an appointment
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { action = 'create_link' } = body;

  if (action === 'create_link') {
    // Create a new booking link
    const {
      slug,
      title,
      description,
      duration_minutes = 30,
      team_member_id,
      calendar_id,
      buffer_before = 0,
      buffer_after = 0,
      min_notice_hours = 24,
      max_days_ahead = 60,
      available_days = [1, 2, 3, 4, 5], // Mon-Fri default
      available_hours = { start: '09:00', end: '17:00' },
      questions = [],
    } = body;

    if (!slug || !title) {
      return NextResponse.json({ error: 'Slug and title required' }, { status: 400 });
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('crm_booking_links')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 });
    }

    const { data: link, error } = await supabase
      .from('crm_booking_links')
      .insert({
        slug,
        title,
        description,
        duration_minutes,
        team_member_id,
        calendar_id,
        buffer_before,
        buffer_after,
        min_notice_hours,
        max_days_ahead,
        available_days,
        available_hours,
        questions,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link });
  }

  if (action === 'book') {
    // Book an appointment
    const {
      link_id,
      slot_start,
      slot_end,
      guest_name,
      guest_email,
      guest_phone,
      answers = {},
      notes,
      contact_id, // Optional: link to existing CRM contact
      deal_id, // Optional: link to existing deal
    } = body;

    if (!link_id || !slot_start || !slot_end || !guest_name || !guest_email) {
      return NextResponse.json({ 
        error: 'Missing required fields: link_id, slot_start, slot_end, guest_name, guest_email' 
      }, { status: 400 });
    }

    // Get the booking link
    const { data: link, error: linkError } = await supabase
      .from('crm_booking_links')
      .select('*, team_member:crm_team_members(id, name, email)')
      .eq('id', link_id)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: 'Booking link not found' }, { status: 404 });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('crm_bookings')
      .insert({
        booking_link_id: link_id,
        team_member_id: link.team_member_id,
        start_time: slot_start,
        end_time: slot_end,
        guest_name,
        guest_email,
        guest_phone,
        answers,
        notes,
        contact_id,
        deal_id,
        status: 'confirmed',
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // TODO: Create Google Calendar event if calendar connected
    // TODO: Send confirmation emails
    // TODO: Create activity log in CRM

    // Log activity if contact_id provided
    if (contact_id) {
      await supabase.from('crm_activities').insert({
        contact_id,
        deal_id,
        type: 'meeting',
        subject: `Meeting booked: ${link.title}`,
        body: `${guest_name} booked a ${link.duration_minutes} minute meeting for ${new Date(slot_start).toLocaleString()}`,
      });
    }

    return NextResponse.json({ 
      booking,
      message: 'Meeting booked successfully',
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Helper: Get available slots for a date
async function getAvailableSlots(
  supabase: ReturnType<typeof createAdminClient>,
  link: BookingLink,
  dateStr: string
): Promise<BookingSlot[]> {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();

  // Check if day is available
  if (!link.available_days.includes(dayOfWeek)) {
    return [];
  }

  const slots: BookingSlot[] = [];
  const [startHour, startMin] = link.available_hours.start.split(':').map(Number);
  const [endHour, endMin] = link.available_hours.end.split(':').map(Number);

  // Generate slots
  let currentTime = new Date(date);
  currentTime.setHours(startHour, startMin, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(endHour, endMin, 0, 0);

  // Get existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('crm_bookings')
    .select('start_time, end_time')
    .eq('booking_link_id', link.id)
    .eq('status', 'confirmed')
    .gte('start_time', date.toISOString())
    .lt('start_time', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());

  const bookedSlots = existingBookings || [];

  while (currentTime < endTime) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime.getTime() + link.duration_minutes * 60 * 1000);

    // Check if slot is available (not overlapping with existing bookings)
    const isBooked = bookedSlots.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });

    // Check minimum notice
    const minNoticeTime = new Date(Date.now() + link.min_notice_hours * 60 * 60 * 1000);
    const hasEnoughNotice = slotStart >= minNoticeTime;

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: !isBooked && hasEnoughNotice,
    });

    // Move to next slot (considering buffer)
    currentTime = new Date(slotEnd.getTime() + (link.buffer_after || 0) * 60 * 1000);
  }

  return slots;
}
