-- Migration: Multi-Pipeline Support
-- Adds ability to have multiple pipelines (Hot Deals, Warm, Lead Pool/Prospects)

-- =====================================================
-- PIPELINES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  icon TEXT DEFAULT 'pipeline',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADD PIPELINE_ID TO DEALS
-- =====================================================
ALTER TABLE crm_deals 
ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE SET NULL;

-- =====================================================
-- ADD PIPELINE_ID TO PIPELINE_STAGES
-- =====================================================
ALTER TABLE crm_pipeline_stages 
ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES crm_pipelines(id) ON DELETE CASCADE;

-- =====================================================
-- INSERT DEFAULT PIPELINES
-- =====================================================
INSERT INTO crm_pipelines (id, name, slug, description, color, icon, position, is_default) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Hot Deals', 'hot-deals', 'Active deals in negotiation', '#ef4444', 'flame', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'Warm', 'warm', 'Interested prospects with potential', '#f59e0b', 'sun', 2, false),
  ('33333333-3333-3333-3333-333333333333', 'Lead Pool', 'lead-pool', 'New leads and prospects', '#3b82f6', 'users', 3, false)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- UPDATE EXISTING STAGES TO DEFAULT PIPELINE
-- =====================================================
UPDATE crm_pipeline_stages 
SET pipeline_id = '11111111-1111-1111-1111-111111111111'
WHERE pipeline_id IS NULL;

-- =====================================================
-- UPDATE EXISTING DEALS TO DEFAULT PIPELINE
-- =====================================================
UPDATE crm_deals 
SET pipeline_id = '11111111-1111-1111-1111-111111111111'
WHERE pipeline_id IS NULL;

-- =====================================================
-- CREATE STAGES FOR WARM PIPELINE
-- =====================================================
INSERT INTO crm_pipeline_stages (id, name, color, position, is_won, is_lost, pipeline_id) VALUES
  ('warm-new', 'New', '#f59e0b', 1, false, false, '22222222-2222-2222-2222-222222222222'),
  ('warm-researching', 'Researching', '#fbbf24', 2, false, false, '22222222-2222-2222-2222-222222222222'),
  ('warm-contacted', 'Contacted', '#f97316', 3, false, false, '22222222-2222-2222-2222-222222222222'),
  ('warm-interested', 'Interested', '#ea580c', 4, false, false, '22222222-2222-2222-2222-222222222222'),
  ('warm-qualified', 'Qualified', '#22c55e', 5, false, false, '22222222-2222-2222-2222-222222222222'),
  ('warm-not-interested', 'Not Interested', '#ef4444', 6, false, true, '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CREATE STAGES FOR LEAD POOL PIPELINE
-- =====================================================
INSERT INTO crm_pipeline_stages (id, name, color, position, is_won, is_lost, pipeline_id) VALUES
  ('pool-new', 'New Leads', '#3b82f6', 1, false, false, '33333333-3333-3333-3333-333333333333'),
  ('pool-to-research', 'To Research', '#6366f1', 2, false, false, '33333333-3333-3333-3333-333333333333'),
  ('pool-researched', 'Researched', '#8b5cf6', 3, false, false, '33333333-3333-3333-3333-333333333333'),
  ('pool-to-contact', 'To Contact', '#a855f7', 4, false, false, '33333333-3333-3333-3333-333333333333'),
  ('pool-promoted', 'Promoted to Warm', '#22c55e', 5, true, false, '33333333-3333-3333-3333-333333333333'),
  ('pool-disqualified', 'Disqualified', '#ef4444', 6, false, true, '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ADD INDEX FOR PIPELINE QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_crm_deals_pipeline ON crm_deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_pipeline ON crm_pipeline_stages(pipeline_id);

-- =====================================================
-- RLS FOR PIPELINES
-- =====================================================
ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on crm_pipelines" ON crm_pipelines FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- UPDATED_AT TRIGGER FOR PIPELINES
-- =====================================================
CREATE OR REPLACE TRIGGER crm_pipelines_updated_at
  BEFORE UPDATE ON crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at();
