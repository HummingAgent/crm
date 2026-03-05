-- Lead Scoring System
-- Adds scoring fields to contacts and deals

-- Add lead_score to contacts
ALTER TABLE crm_contacts 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;

-- Add lead_score to deals  
ALTER TABLE crm_deals
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;

-- Scoring rules table for customizable scoring
CREATE TABLE IF NOT EXISTS crm_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'demographic', 'behavioral', 'firmographic'
  field TEXT NOT NULL, -- which field to check
  operator TEXT NOT NULL, -- 'equals', 'contains', 'greater_than', 'less_than', 'exists'
  value TEXT, -- the value to compare against
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default scoring rules
INSERT INTO crm_scoring_rules (name, category, field, operator, value, points) VALUES
-- Job Title scoring (demographic)
('C-Level Executive', 'demographic', 'job_title', 'contains', 'CEO,CTO,CFO,COO,CMO,Chief', 25),
('VP Level', 'demographic', 'job_title', 'contains', 'VP,Vice President', 20),
('Director Level', 'demographic', 'job_title', 'contains', 'Director', 15),
('Manager Level', 'demographic', 'job_title', 'contains', 'Manager', 10),
('Has Job Title', 'demographic', 'job_title', 'exists', NULL, 5),

-- Contact Info (demographic)
('Has Email', 'demographic', 'email', 'exists', NULL, 10),
('Has Phone', 'demographic', 'phone', 'exists', NULL, 10),
('Has LinkedIn', 'demographic', 'linkedin_url', 'exists', NULL, 5),

-- Company association (firmographic)
('Has Company', 'firmographic', 'company_id', 'exists', NULL, 15),

-- Lead Source scoring (behavioral)
('Referral Lead', 'behavioral', 'lead_source', 'equals', 'referral', 25),
('Inbound Lead', 'behavioral', 'lead_source', 'equals', 'inbound', 20),
('Website Lead', 'behavioral', 'lead_source', 'equals', 'website', 15),
('Event Lead', 'behavioral', 'lead_source', 'equals', 'event', 15),
('Outbound LinkedIn', 'behavioral', 'lead_source', 'equals', 'outbound-linkedin', 10),
('Outbound Email', 'behavioral', 'lead_source', 'equals', 'outbound-email', 5),

-- Activity scoring
('Recent Activity', 'behavioral', 'last_activity_days', 'less_than', '7', 20),
('Some Activity', 'behavioral', 'last_activity_days', 'less_than', '30', 10),

-- Deal association
('Has Active Deal', 'behavioral', 'has_deal', 'equals', 'true', 30),
('High Value Deal', 'behavioral', 'deal_amount', 'greater_than', '50000', 25),
('Medium Value Deal', 'behavioral', 'deal_amount', 'greater_than', '10000', 15)

ON CONFLICT DO NOTHING;

-- Index for faster scoring queries
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON crm_contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_lead_score ON crm_deals(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_active ON crm_scoring_rules(is_active) WHERE is_active = true;
