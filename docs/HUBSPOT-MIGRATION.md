# HubSpot to CRM Migration Plan

## Source File
`docs/hubspot-export.csv` - Full HubSpot deals export

## Key Fields to Add to Schema

### High Priority (Need for Import)

| HubSpot Field | Our Field | Notes |
|---------------|-----------|-------|
| Record ID | `hubspot_id` | Track imported records, prevent duplicates |
| Deal probability | `probability` | 0.0-1.0, currently implicit in stage |
| Days to close | `days_to_close` | Calculated or stored |
| Annual contract value | `annual_contract_value` | ACV for SaaS deals |
| Annual recurring revenue | `annual_recurring_revenue` | ARR tracking |
| Monthly recurring revenue | `monthly_recurring_revenue` | MRR tracking |
| Total contract value | `total_contract_value` | TCV |
| Weighted amount | `weighted_amount` | probability × amount |
| Closed Lost Reason | `closed_lost_reason` | Why we lost |
| Closed Won Reason | `closed_won_reason` | Why we won |
| Dead deal reason | `dead_deal_reason` | Why deal went dead |
| Deal Tags | `tags` | Array of strings |
| Next step | `next_step` | Free text for next action |
| Next Activity Date | `next_activity_date` | Follow-up scheduling |

### Medium Priority (Nice to Have)

| HubSpot Field | Our Field | Notes |
|---------------|-----------|-------|
| Deal Collaborator | `collaborators` | Array of user IDs |
| Forecast amount | `forecast_amount` | For pipeline forecasting |
| Forecast category | `forecast_category` | Pipeline/Commit/Upside/etc |
| Number of times contacted | `contact_count` | Auto-increment |
| Number of Sales Activities | `activity_count` | Auto-count from activities |
| Lead Type | `lead_type` | External/Internal/Referral/Inbound |
| Original Traffic Source | `original_source` | First touch attribution |
| Latest Traffic Source | `latest_source` | Last touch attribution |

### Already Have (Map Directly)

| HubSpot Field | Our Field |
|---------------|-----------|
| Deal Name | `name` |
| Amount | `amount` |
| Close Date | `close_date` |
| Create Date | `created_at` |
| Deal Stage | `stage` |
| Deal Type | `deal_type` |
| Priority | `priority` |
| Deal Description | `description` |
| Deal owner | `owner_id` (need user lookup) |
| Associated Company | `company_id` (need company lookup/create) |
| Associated Contact | `primary_contact_id` (need contact lookup/create) |

## Stage Mapping

| HubSpot Stage | Our Stage |
|---------------|-----------|
| Discovery Call | `discovery-scheduled` |
| Create Proposal | `proposal-draft` |
| Proposal Sent | `proposal-sent` |
| Closed Won | `closed-won` |
| Closed Lost | `closed-lost` |
| Pending | `new-lead` |
| Discovery Review | `discovery-complete` |
| Follow-Up | `follow-up` |
| Dead Deals | `dead` |

## Schema Migration SQL

```sql
-- Add new fields to crm_deals
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS probability DECIMAL(3,2);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS days_to_close INTEGER;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS monthly_recurring_revenue DECIMAL(15,2);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS total_contract_value DECIMAL(15,2);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS weighted_amount DECIMAL(15,2);
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS closed_lost_reason TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS closed_won_reason TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS dead_deal_reason TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_step TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS next_activity_date TIMESTAMPTZ;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS lead_type TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS original_source TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS latest_source TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS activity_count INTEGER DEFAULT 0;

-- Add hubspot_id to contacts and companies for linking
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS hubspot_id TEXT UNIQUE;

-- Index for hubspot lookups
CREATE INDEX IF NOT EXISTS idx_crm_deals_hubspot ON crm_deals(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_hubspot ON crm_contacts(hubspot_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_hubspot ON crm_companies(hubspot_id);
```

## Import Process

1. **Run schema migration** (above SQL)
2. **Parse CSV** and create import script
3. **Create companies first** (dedupe by name)
4. **Create contacts** (parse from "Name (email)" format)
5. **Create deals** with foreign keys
6. **Import notes** from "Associated Note" field
7. **Log activities** from associated emails/meetings

## Notes from Data

- 56 deals total in export
- Deal owners: Shawn Kercher, Joey kercher, Brian Watson, Jessica Brodsky
- Stages used: Discovery Call, Create Proposal, Proposal Sent, Closed Won, Closed Lost, Pending, Discovery Review, Follow-Up, Dead Deals
- Lead types: External, Internal, Inbound Website, Referral, Linkedin
- Some deals have extensive notes in "Associated Note" field
