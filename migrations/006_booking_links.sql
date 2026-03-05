-- Branded Booking Links (Calendly replacement)
-- Custom scheduling pages with CRM integration

-- Booking Links table (like Calendly event types)
CREATE TABLE IF NOT EXISTS crm_booking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- URL slug: /book/slug
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  team_member_id UUID REFERENCES crm_team_members(id),
  calendar_id TEXT, -- Google Calendar ID to check availability
  buffer_before INTEGER DEFAULT 0, -- Minutes before meeting
  buffer_after INTEGER DEFAULT 0, -- Minutes after meeting
  min_notice_hours INTEGER DEFAULT 24, -- Minimum hours in advance
  max_days_ahead INTEGER DEFAULT 60, -- Max days to book ahead
  available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Sun, 1=Mon, etc
  available_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
  questions JSONB DEFAULT '[]', -- Custom questions: [{id, label, required, type}]
  confirmation_message TEXT,
  redirect_url TEXT, -- Optional redirect after booking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings table (actual scheduled meetings)
CREATE TABLE IF NOT EXISTS crm_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID REFERENCES crm_booking_links(id) NOT NULL,
  team_member_id UUID REFERENCES crm_team_members(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  answers JSONB DEFAULT '{}', -- Answers to custom questions
  notes TEXT,
  contact_id UUID REFERENCES crm_contacts(id), -- Link to CRM contact
  deal_id UUID REFERENCES crm_deals(id), -- Link to deal
  google_event_id TEXT, -- Google Calendar event ID
  status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, rescheduled, completed
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_links_slug ON crm_booking_links(slug);
CREATE INDEX IF NOT EXISTS idx_booking_links_active ON crm_booking_links(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_link ON crm_bookings(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_bookings_team_member ON crm_bookings(team_member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON crm_bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_contact ON crm_bookings(contact_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deal ON crm_bookings(deal_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON crm_bookings(status);

-- Enable RLS
ALTER TABLE crm_booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_bookings ENABLE ROW LEVEL SECURITY;

-- Permissive policies (public booking pages need access)
CREATE POLICY "booking_links_public_read" ON crm_booking_links 
  FOR SELECT USING (is_active = true);

CREATE POLICY "booking_links_auth_all" ON crm_booking_links 
  FOR ALL USING (true);

CREATE POLICY "bookings_public_insert" ON crm_bookings 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "bookings_auth_all" ON crm_bookings 
  FOR ALL USING (true);
