#!/usr/bin/env node
/**
 * HubSpot to CRM Import Script
 * 
 * Run with: node scripts/import-hubspot.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Stage mapping from HubSpot to our stages
const STAGE_MAP = {
  'Discovery Call': 'discovery-scheduled',
  'Create Proposal': 'proposal-draft',
  'Proposal Sent': 'proposal-sent',
  'Contract Sent': 'contract-sent',
  'Closed Won': 'closed-won',
  'Closed Lost': 'closed-lost',
  'Pending': 'new-lead',
  'Discovery Review': 'discovery-complete',
  'Follow-Up': 'follow-up',
  'Dead Deals': 'dead',
  'Current Customer': 'current-customer',
};

// Parse CSV row
function parseCSVRow(row, headers) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = values[i] || '';
  });
  return obj;
}

// Parse "Name (email)" format
function parseContact(str) {
  if (!str) return null;
  
  // Handle multiple contacts separated by ;
  const first = str.split(';')[0].trim();
  if (!first) return null;
  
  // Match "Name (email)" pattern
  const match = first.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    const fullName = match[1].trim();
    const email = match[2].trim();
    const nameParts = fullName.split(' ');
    return {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || null,
      email: email,
    };
  }
  
  // Just an email
  if (first.includes('@')) {
    return { first_name: first.split('@')[0], last_name: null, email: first };
  }
  
  return { first_name: first, last_name: null, email: null };
}

// Parse date
function parseDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

// Parse amount
function parseAmount(str) {
  if (!str) return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function main() {
  console.log('🚀 Starting HubSpot import...\n');
  
  // Read CSV
  const csvPath = path.join(__dirname, '..', 'docs', 'hubspot-export.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  
  // Split into lines (handling quoted newlines)
  const rows = [];
  let currentRow = '';
  let inQuotes = false;
  
  for (const char of content) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === '\n' && !inQuotes) {
      if (currentRow.trim()) rows.push(currentRow);
      currentRow = '';
    } else {
      currentRow += char;
    }
  }
  if (currentRow.trim()) rows.push(currentRow);
  
  // Parse header
  const headerRow = rows[0];
  const headers = [];
  let hCurrent = '';
  let hInQuotes = false;
  for (const char of headerRow) {
    if (char === '"') hInQuotes = !hInQuotes;
    else if (char === ',' && !hInQuotes) {
      headers.push(hCurrent.replace(/^"|"$/g, '').trim());
      hCurrent = '';
    } else {
      hCurrent += char;
    }
  }
  headers.push(hCurrent.replace(/^"|"$/g, '').trim());
  
  console.log(`📊 Found ${rows.length - 1} deals to import\n`);
  
  // Track created records
  const companies = new Map(); // name -> id
  const contacts = new Map(); // email -> id
  let dealsCreated = 0;
  let dealsSkipped = 0;
  let companiesCreated = 0;
  let contactsCreated = 0;
  
  // Process each row
  for (let i = 1; i < rows.length; i++) {
    const row = parseCSVRow(rows[i], headers);
    
    const hubspotId = row['Record ID'];
    const dealName = row['Deal Name'];
    
    if (!dealName) {
      console.log(`⚠️  Row ${i}: No deal name, skipping`);
      dealsSkipped++;
      continue;
    }
    
    // Check if already imported by name (since hubspot_id column may not exist)
    const { data: existing } = await supabase
      .from('crm_deals')
      .select('id')
      .eq('name', dealName)
      .single();
    
    if (existing) {
      console.log(`⏭️  "${dealName}" already exists, skipping`);
      dealsSkipped++;
      continue;
    }
    
    // Create company if needed
    let companyId = null;
    const companyName = row['Associated Company (Primary)'] || row['Associated Company'];
    if (companyName && companyName.trim()) {
      const cleanName = companyName.trim();
      
      if (companies.has(cleanName)) {
        companyId = companies.get(cleanName);
      } else {
        // Check if exists
        const { data: existingCo } = await supabase
          .from('crm_companies')
          .select('id')
          .eq('name', cleanName)
          .single();
        
        if (existingCo) {
          companyId = existingCo.id;
          companies.set(cleanName, companyId);
        } else {
          // Create new
          const { data: newCo, error } = await supabase
            .from('crm_companies')
            .insert({ name: cleanName })
            .select('id')
            .single();
          
          if (newCo) {
            companyId = newCo.id;
            companies.set(cleanName, companyId);
            companiesCreated++;
          }
        }
      }
    }
    
    // Create contact if needed
    let contactId = null;
    const contactStr = row['Associated Contact'];
    const contactInfo = parseContact(contactStr);
    
    if (contactInfo && contactInfo.email) {
      if (contacts.has(contactInfo.email)) {
        contactId = contacts.get(contactInfo.email);
      } else {
        // Check if exists
        const { data: existingContact } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('email', contactInfo.email)
          .single();
        
        if (existingContact) {
          contactId = existingContact.id;
          contacts.set(contactInfo.email, contactId);
        } else {
          // Create new
          const { data: newContact, error } = await supabase
            .from('crm_contacts')
            .insert({
              first_name: contactInfo.first_name,
              last_name: contactInfo.last_name,
              email: contactInfo.email,
              company_id: companyId,
            })
            .select('id')
            .single();
          
          if (newContact) {
            contactId = newContact.id;
            contacts.set(contactInfo.email, contactId);
            contactsCreated++;
          }
        }
      }
    }
    
    // Map stage
    const hubspotStage = row['Deal Stage'];
    const stage = STAGE_MAP[hubspotStage] || 'new-lead';
    
    // Map priority
    let priority = (row['Priority'] || 'medium').toLowerCase();
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      priority = 'medium';
    }
    
    // Build deal record using ONLY existing columns
    const deal = {
      name: dealName,
      description: row['Deal Description'] || row['Associated Note']?.substring(0, 2000) || null,
      stage: stage,
      amount: parseAmount(row['Amount']),
      annual_contract_value: parseAmount(row['Annual contract value']),
      expected_close_date: parseDate(row['Close Date']),
      close_date: row['Is Closed Won'] === 'true' ? parseDate(row['Close Date']) : null,
      closed_at: row['Is Deal Closed?'] === 'true' ? parseDate(row['Close Date']) : null,
      close_reason: row['Closed Lost Reason'] || row['Closed Won Reason'] || null,
      company_id: companyId,
      primary_contact_id: contactId,
      priority: priority,
      lead_source: row['Lead Type'] || row['Original Traffic Source'] || null,
      lead_source_detail: row['Original Traffic Source Drill-Down 1'] || null,
      deal_type: row['Deal Type'] || null,
      created_at: parseDate(row['Create Date']) || new Date().toISOString(),
    };
    
    // Insert deal
    const { data: newDeal, error } = await supabase
      .from('crm_deals')
      .insert(deal)
      .select('id')
      .single();
    
    if (error) {
      console.log(`❌ Failed to import "${dealName}": ${error.message}`);
      dealsSkipped++;
    } else {
      console.log(`✅ Imported: ${dealName} (${stage})`);
      dealsCreated++;
      
      // Add note if there's one (and it's substantial)
      const note = row['Associated Note'];
      if (note && note.length > 100) {
        await supabase.from('crm_activities').insert({
          deal_id: newDeal.id,
          type: 'note',
          subject: 'Imported from HubSpot',
          body: note.substring(0, 50000), // Allow longer notes
        });
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Complete!');
  console.log('='.repeat(50));
  console.log(`✅ Deals created: ${dealsCreated}`);
  console.log(`⏭️  Deals skipped: ${dealsSkipped}`);
  console.log(`🏢 Companies created: ${companiesCreated}`);
  console.log(`👤 Contacts created: ${contactsCreated}`);
}

main().catch(console.error);
