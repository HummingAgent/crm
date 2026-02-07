-- CRM Database Cleanup
-- Run this FIRST if you get errors running schema.sql
-- Then run schema.sql again

DROP TABLE IF EXISTS crm_deal_products CASCADE;
DROP TABLE IF EXISTS crm_products CASCADE;
DROP TABLE IF EXISTS crm_activities CASCADE;
DROP TABLE IF EXISTS crm_deal_contacts CASCADE;
DROP TABLE IF EXISTS crm_deals CASCADE;
DROP TABLE IF EXISTS crm_contacts CASCADE;
DROP TABLE IF EXISTS crm_companies CASCADE;
DROP TABLE IF EXISTS crm_pipeline_stages CASCADE;
DROP FUNCTION IF EXISTS crm_update_updated_at() CASCADE;
