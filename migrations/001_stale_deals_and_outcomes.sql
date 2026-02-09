-- Migration: Add next_action fields and outcome tracking to crm_deals
-- Run this against your Supabase database

-- Add next_action and next_action_date columns (if not already present via next_step/next_activity_date)
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_action text;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_action_date date;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_action_type text; -- call, email, meeting, demo

-- Add outcome tracking
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS outcome text; -- won, lost, null (open)
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS outcome_reason text;

-- Add crm_settings table for digest/stale thresholds
CREATE TABLE IF NOT EXISTS crm_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert default stale thresholds
INSERT INTO crm_settings (key, value) VALUES 
  ('stale_thresholds', '{"new-lead": 2, "discovery-scheduled": 3, "discovery-complete": 5, "proposal-draft": 3, "proposal-sent": 3, "contract-sent": 5}'),
  ('digest_time', '"09:00"'),
  ('slack_webhook_url', '""')
ON CONFLICT (key) DO NOTHING;

-- Index for efficient digest queries
CREATE INDEX IF NOT EXISTS idx_crm_deals_next_action_date ON crm_deals (next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_last_activity_at ON crm_deals (last_activity_at);
CREATE INDEX IF NOT EXISTS idx_crm_deals_outcome ON crm_deals (outcome) WHERE outcome IS NOT NULL;
