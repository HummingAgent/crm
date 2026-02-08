-- HubSpot Migration Schema Updates
-- Run this AFTER the base schema.sql

-- =====================================================
-- ADD NEW DEAL FIELDS
-- =====================================================

-- HubSpot tracking
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;

-- Probability and forecasting
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS probability DECIMAL(3,2);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS days_to_close INTEGER;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS weighted_amount DECIMAL(15,2);

-- Revenue metrics
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS monthly_recurring_revenue DECIMAL(15,2);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS total_contract_value DECIMAL(15,2);

-- Close reasons
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS closed_lost_reason TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS closed_won_reason TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS dead_deal_reason TEXT;

-- Organization
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_step TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_activity_date TIMESTAMPTZ;

-- Attribution
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS lead_type TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS original_source TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS latest_source TEXT;

-- Activity counters
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS activity_count INTEGER DEFAULT 0;

-- =====================================================
-- ADD HUBSPOT IDs TO CONTACTS/COMPANIES
-- =====================================================

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;

-- =====================================================
-- INDEXES FOR NEW FIELDS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_crm_deals_hubspot ON crm_deals(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_probability ON crm_deals(probability);
CREATE INDEX IF NOT EXISTS idx_crm_deals_next_activity ON crm_deals(next_activity_date);
CREATE INDEX IF NOT EXISTS idx_crm_deals_tags ON crm_deals USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_hubspot ON crm_contacts(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_hubspot ON crm_companies(hubspot_id);

-- =====================================================
-- UPDATE STAGE MAPPINGS (add missing stages from HubSpot)
-- =====================================================

INSERT INTO crm_pipeline_stages (id, name, color, position, is_won, is_lost) VALUES
  ('pending', 'Pending', '#94a3b8', 0, false, false)
ON CONFLICT (id) DO NOTHING;
