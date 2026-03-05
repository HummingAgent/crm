-- Contact Research Fields
-- Adds research data storage for AI-generated contact insights

-- Add research fields to contacts
ALTER TABLE crm_contacts 
ADD COLUMN IF NOT EXISTS research_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMPTZ;

-- Index for finding contacts needing research
CREATE INDEX IF NOT EXISTS idx_contacts_last_researched ON crm_contacts(last_researched_at);

-- Add company research fields too
ALTER TABLE crm_companies
ADD COLUMN IF NOT EXISTS research_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS employee_count INTEGER,
ADD COLUMN IF NOT EXISTS annual_revenue TEXT,
ADD COLUMN IF NOT EXISTS founded_year INTEGER,
ADD COLUMN IF NOT EXISTS headquarters TEXT;

-- Comment on research_data structure
COMMENT ON COLUMN crm_contacts.research_data IS 'AI-generated research: {summary, linkedin_insights, company_insights, pain_points[], talking_points[], recommended_approach, researched_at}';
COMMENT ON COLUMN crm_companies.research_data IS 'AI-generated company research: {summary, products, competitors, recent_news, pain_points[], researched_at}';
