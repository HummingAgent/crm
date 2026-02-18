-- Google Calendar Integration for Team View
-- Run in Supabase SQL Editor

-- =====================================================
-- TEAM MEMBERS
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  color TEXT NOT NULL DEFAULT '#8b5cf6', -- Calendar color for this member
  role TEXT DEFAULT 'member', -- admin, member
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Auth (matches Supabase auth.users if they log in)
  auth_user_id UUID UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GOOGLE CALENDAR CONNECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES crm_team_members(id) ON DELETE CASCADE,
  
  -- OAuth tokens (encrypted in production)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Google account info
  google_email TEXT NOT NULL,
  google_calendar_id TEXT DEFAULT 'primary', -- Which calendar to sync
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_member_id, google_calendar_id)
);

-- =====================================================
-- CALENDAR EVENTS (cached from Google)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id TEXT NOT NULL,
  calendar_connection_id UUID NOT NULL REFERENCES crm_calendar_connections(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES crm_team_members(id) ON DELETE CASCADE,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  timezone TEXT,
  
  -- Attendees
  attendees JSONB, -- [{email, name, responseStatus}]
  organizer_email TEXT,
  
  -- Status
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  
  -- Meeting links
  hangout_link TEXT,
  conference_data JSONB,
  
  -- CRM linking (if this meeting is linked to a deal/contact)
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(google_event_id, calendar_connection_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_crm_calendar_events_time ON crm_calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_crm_calendar_events_member ON crm_calendar_events(team_member_id);
CREATE INDEX IF NOT EXISTS idx_crm_calendar_connections_member ON crm_calendar_connections(team_member_id);

-- =====================================================
-- RLS POLICIES (permissive for now, like other tables)
-- =====================================================
ALTER TABLE crm_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for crm_team_members" ON crm_team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for crm_calendar_connections" ON crm_calendar_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for crm_calendar_events" ON crm_calendar_events FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- SEED: Initial Team Members
-- =====================================================
INSERT INTO crm_team_members (email, name, color, role) VALUES
  ('shawn@hummingagent.ai', 'Shawn Kercher', '#8b5cf6', 'admin'),
  ('joey@hummingagent.ai', 'Joey Kercher', '#3b82f6', 'admin')
ON CONFLICT (email) DO NOTHING;
