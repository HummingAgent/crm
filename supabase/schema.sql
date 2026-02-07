-- HummingAgent CRM Schema
-- Prefix: crm_ (to share db with other apps)
-- 
-- USAGE: Run this entire file in Supabase SQL Editor
-- If you get errors, run the CLEANUP section first, then re-run everything.

-- =====================================================
-- CLEANUP (uncomment if you need to reset)
-- =====================================================
-- DROP TABLE IF EXISTS crm_deal_products CASCADE;
-- DROP TABLE IF EXISTS crm_products CASCADE;
-- DROP TABLE IF EXISTS crm_activities CASCADE;
-- DROP TABLE IF EXISTS crm_deal_contacts CASCADE;
-- DROP TABLE IF EXISTS crm_deals CASCADE;
-- DROP TABLE IF EXISTS crm_contacts CASCADE;
-- DROP TABLE IF EXISTS crm_companies CASCADE;
-- DROP TABLE IF EXISTS crm_pipeline_stages CASCADE;
-- DROP FUNCTION IF EXISTS crm_update_updated_at() CASCADE;

-- =====================================================
-- COMPANIES
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  company_size TEXT, -- '1-10', '11-50', '51-200', '201-500', '500+'
  website TEXT,
  linkedin_url TEXT,
  description TEXT,
  logo_url TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  
  -- Research (auto-populated by AI agent)
  research_notes TEXT,
  research_updated_at TIMESTAMPTZ,
  
  -- Metadata
  owner_id UUID, -- HummingAgent user who owns this company
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTACTS
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  
  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  job_title TEXT,
  department TEXT,
  
  -- Social
  linkedin_url TEXT,
  twitter_handle TEXT,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, inactive, bounced
  lead_source TEXT, -- inbound, outbound, referral, website, event
  
  -- Metadata
  owner_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DEALS (Pipeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pipeline stage
  stage TEXT NOT NULL DEFAULT 'new-lead',
  -- Stages: new-lead, discovery-scheduled, discovery-complete, proposal-draft, 
  --         proposal-sent, contract-sent, closed-won, closed-lost, 
  --         follow-up, current-customer, dead
  
  -- Financials
  amount DECIMAL(15,2), -- Deal value
  annual_contract_value DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  
  -- Deal type
  deal_type TEXT, -- new-business, expansion, renewal
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Dates
  close_date DATE,
  expected_close_date DATE,
  last_activity_at TIMESTAMPTZ,
  
  -- Relations
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  
  -- Lead source tracking
  lead_source TEXT, -- inbound, outbound-linkedin, outbound-email, referral, website, event
  lead_source_detail TEXT, -- e.g., "Apollo Campaign Q1", "LinkedIn - Joey"
  
  -- Owner
  owner_id UUID,
  created_by UUID,
  
  -- Close info (for won/lost)
  closed_at TIMESTAMPTZ,
  close_reason TEXT, -- won: signed, lost: budget, competitor, timing, no-response, etc
  competitor_name TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DEAL CONTACTS (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  role TEXT, -- decision-maker, influencer, champion, end-user, blocker
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, contact_id)
);

-- =====================================================
-- ACTIVITIES (unified timeline)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What this activity is about
  deal_id UUID REFERENCES crm_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  
  -- Activity type
  type TEXT NOT NULL, -- email, call, meeting, note, task, stage-change, linkedin-message
  
  -- Content
  subject TEXT,
  body TEXT,
  
  -- For emails
  email_direction TEXT, -- inbound, outbound
  email_from TEXT,
  email_to TEXT[],
  email_cc TEXT[],
  email_message_id TEXT, -- for threading
  email_thread_id TEXT,
  
  -- For meetings
  meeting_start TIMESTAMPTZ,
  meeting_end TIMESTAMPTZ,
  meeting_location TEXT,
  meeting_attendees TEXT[],
  meeting_recording_url TEXT,
  meeting_transcript_id UUID, -- link to transcription service
  
  -- For calls
  call_duration INTEGER, -- seconds
  call_direction TEXT, -- inbound, outbound
  call_outcome TEXT, -- connected, voicemail, no-answer
  
  -- For tasks
  task_due_date TIMESTAMPTZ,
  task_completed BOOLEAN DEFAULT FALSE,
  task_completed_at TIMESTAMPTZ,
  
  -- For stage changes
  stage_from TEXT,
  stage_to TEXT,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS / LINE ITEMS (for deal value breakdown)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(15,2),
  billing_cycle TEXT, -- monthly, annual, one-time
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES crm_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- denormalized for flexibility
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2),
  discount_percent DECIMAL(5,2) DEFAULT 0,
  total_price DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PIPELINE STAGES (customizable per user/org)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id TEXT PRIMARY KEY, -- slug like 'new-lead'
  name TEXT NOT NULL,
  color TEXT DEFAULT '#71717a',
  position INTEGER NOT NULL,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default stages
INSERT INTO crm_pipeline_stages (id, name, color, position, is_won, is_lost) VALUES
  ('new-lead', 'New Leads', '#8b5cf6', 1, false, false),
  ('discovery-scheduled', 'Discovery Scheduled', '#3b82f6', 2, false, false),
  ('discovery-complete', 'Discovery Complete', '#06b6d4', 3, false, false),
  ('proposal-draft', 'Create Proposal', '#f59e0b', 4, false, false),
  ('proposal-sent', 'Proposal Sent', '#f97316', 5, false, false),
  ('contract-sent', 'Contract Sent', '#ec4899', 6, false, false),
  ('closed-won', 'Closed Won', '#22c55e', 7, true, false),
  ('follow-up', 'Follow-up', '#64748b', 8, false, false),
  ('current-customer', 'Current Customer', '#10b981', 9, true, false),
  ('closed-lost', 'Closed Lost', '#ef4444', 10, false, true),
  ('dead', 'Dead Deals', '#374151', 11, false, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON crm_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_company ON crm_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_close_date ON crm_deals(expected_close_date);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm_contacts(owner_id);

CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_company ON crm_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created ON crm_activities(created_at DESC);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION crm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER crm_companies_updated_at
  BEFORE UPDATE ON crm_companies
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at();

CREATE OR REPLACE TRIGGER crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at();

CREATE OR REPLACE TRIGGER crm_deals_updated_at
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at();

-- =====================================================
-- RLS POLICIES (enable later for multi-tenant)
-- =====================================================
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Allow all for now (restrict later)
CREATE POLICY "Allow all on crm_companies" ON crm_companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_contacts" ON crm_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_deals" ON crm_deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_deal_contacts" ON crm_deal_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_activities" ON crm_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_products" ON crm_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_deal_products" ON crm_deal_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crm_pipeline_stages" ON crm_pipeline_stages FOR ALL USING (true) WITH CHECK (true);
