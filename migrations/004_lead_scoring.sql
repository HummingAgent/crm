-- =====================================================
-- Lead Scoring System Migration
-- =====================================================

-- Add scoring columns to contacts
ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;

-- Add scoring columns to deals
ALTER TABLE crm_deals
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- Scoring rules configuration
CREATE TABLE IF NOT EXISTS crm_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'engagement', 'fit', 'behavior'
  conditions JSONB NOT NULL,
  points INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for scoring
CREATE INDEX IF NOT EXISTS idx_scoring_rules_category ON crm_scoring_rules(category);
CREATE INDEX IF NOT EXISTS idx_contacts_score ON crm_contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_score ON crm_deals(lead_score DESC);

-- Default scoring rules
INSERT INTO crm_scoring_rules (name, category, conditions, points, is_active) VALUES
  -- Engagement rules (0-40 points)
  ('Email opened in last 7 days', 'engagement', '{"condition": "email_opened", "days": 7}'::jsonb, 10, true),
  ('Email reply received', 'engagement', '{"condition": "email_reply"}'::jsonb, 15, true),
  ('Meeting attended', 'engagement', '{"condition": "meeting_attended"}'::jsonb, 20, true),
  ('Active in last 7 days', 'engagement', '{"condition": "recent_activity", "days": 7}'::jsonb, 15, true),
  ('Active in last 30 days', 'engagement', '{"condition": "recent_activity", "days": 30}'::jsonb, 10, true),

  -- Fit rules (0-40 points)
  ('Company size 51-200', 'fit', '{"condition": "company_size", "value": "51-200"}'::jsonb, 10, true),
  ('Company size 201-500', 'fit', '{"condition": "company_size", "value": "201-500"}'::jsonb, 15, true),
  ('Company size 500+', 'fit', '{"condition": "company_size", "value": "500+"}'::jsonb, 20, true),
  ('Decision maker title', 'fit', '{"condition": "job_title", "keywords": ["VP", "Director", "Head", "Chief", "C-level"]}'::jsonb, 20, true),
  ('Target industry', 'fit', '{"condition": "industry", "values": ["Technology", "Software", "SaaS"]}'::jsonb, 15, true),

  -- Behavior rules (0-20 points)
  ('Demo requested', 'behavior', '{"condition": "demo_requested"}'::jsonb, 20, true),
  ('Referral', 'behavior', '{"condition": "lead_source", "value": "referral"}'::jsonb, 15, true),
  ('Website visit', 'behavior', '{"condition": "website_visit"}'::jsonb, 10, true)
ON CONFLICT (id) DO NOTHING;

-- RLS for scoring rules
ALTER TABLE crm_scoring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on crm_scoring_rules" ON crm_scoring_rules FOR ALL USING (true) WITH CHECK (true);
