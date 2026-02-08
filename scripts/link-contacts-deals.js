#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(content) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentLine.push(currentField.trim());
        if (currentLine.length > 1 || currentLine[0] !== '') {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }
  return lines;
}

async function main() {
  // Load contacts CSV to build HubSpot ID -> email mapping
  const contactsPath = path.join(__dirname, '..', 'docs', 'hubspot-contacts-export.csv');
  const contactsContent = fs.readFileSync(contactsPath, 'utf-8');
  const contactRows = parseCSV(contactsContent);
  
  const contactHeaders = contactRows[0];
  const hubspotIdToEmail = new Map();
  
  // Column indices for contacts CSV
  const recordIdCol = 0;  // Record ID
  const emailCol = 61;    // Email
  
  for (let i = 1; i < contactRows.length; i++) {
    const row = contactRows[i];
    const hubspotId = row[recordIdCol]?.trim();
    const email = row[emailCol]?.trim().toLowerCase();
    if (hubspotId && email) {
      hubspotIdToEmail.set(hubspotId, email);
    }
  }
  
  console.log(`Loaded ${hubspotIdToEmail.size} HubSpot contact ID -> email mappings`);
  
  // Load deals CSV to get associations
  const dealsPath = path.join(__dirname, '..', 'docs', 'hubspot-export.csv');
  const dealsContent = fs.readFileSync(dealsPath, 'utf-8');
  const dealRows = parseCSV(dealsContent);
  
  const dealHeaders = dealRows[0];
  
  // Find column indices for deals
  const dealNameCol = dealHeaders.findIndex(h => h === 'Deal Name');
  const contactIdsCol = dealHeaders.findIndex(h => h === 'Associated Contact IDs');
  const associatedContactCol = dealHeaders.findIndex(h => h === 'Associated Contact');
  
  console.log(`Deal Name col: ${dealNameCol}, Contact IDs col: ${contactIdsCol}, Associated Contact col: ${associatedContactCol}`);
  
  // Get all our CRM contacts
  const { data: crmContacts } = await supabase
    .from('crm_contacts')
    .select('id, email, first_name, last_name');
  
  const emailToContactId = new Map();
  crmContacts.forEach(c => {
    if (c.email) {
      emailToContactId.set(c.email.toLowerCase(), c.id);
    }
  });
  
  console.log(`Loaded ${emailToContactId.size} CRM contacts`);
  
  // Get all our CRM deals
  const { data: crmDeals } = await supabase
    .from('crm_deals')
    .select('id, name');
  
  const dealNameToId = new Map();
  crmDeals.forEach(d => {
    dealNameToId.set(d.name.toLowerCase().trim(), d.id);
  });
  
  console.log(`Loaded ${dealNameToId.size} CRM deals`);
  
  // Clear existing associations
  console.log('\n🗑️  Clearing existing deal-contact associations...');
  await supabase
    .from('crm_deal_contacts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Build associations
  const associations = [];
  let matched = 0;
  let unmatched = 0;
  
  for (let i = 1; i < dealRows.length; i++) {
    const row = dealRows[i];
    const dealName = row[dealNameCol]?.trim();
    const contactIdsStr = row[contactIdsCol]?.trim();
    const associatedContactStr = row[associatedContactCol]?.trim();
    
    if (!dealName) continue;
    
    const dealId = dealNameToId.get(dealName.toLowerCase());
    if (!dealId) {
      // console.log(`Deal not found: ${dealName}`);
      continue;
    }
    
    // Parse contact IDs (semicolon separated)
    const hubspotContactIds = contactIdsStr ? contactIdsStr.split(';').map(s => s.trim()).filter(Boolean) : [];
    
    // Also try to extract emails from Associated Contact field
    const emailsFromField = [];
    if (associatedContactStr) {
      const emailMatches = associatedContactStr.match(/[\w.-]+@[\w.-]+\.\w+/g);
      if (emailMatches) {
        emailsFromField.push(...emailMatches.map(e => e.toLowerCase()));
      }
    }
    
    // Try to match by HubSpot ID first
    for (const hsId of hubspotContactIds) {
      const email = hubspotIdToEmail.get(hsId);
      if (email) {
        const contactId = emailToContactId.get(email);
        if (contactId) {
          associations.push({ deal_id: dealId, contact_id: contactId });
          matched++;
        } else {
          unmatched++;
        }
      } else {
        unmatched++;
      }
    }
    
    // Also try direct email matches from the Associated Contact field
    for (const email of emailsFromField) {
      const contactId = emailToContactId.get(email);
      if (contactId) {
        // Check if we already have this association
        const exists = associations.some(a => a.deal_id === dealId && a.contact_id === contactId);
        if (!exists) {
          associations.push({ deal_id: dealId, contact_id: contactId });
          matched++;
        }
      }
    }
  }
  
  // Dedupe associations
  const uniqueAssocs = [];
  const seen = new Set();
  for (const a of associations) {
    const key = `${a.deal_id}-${a.contact_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueAssocs.push(a);
    }
  }
  
  console.log(`\n🔗 Creating ${uniqueAssocs.length} deal-contact associations...`);
  
  // Batch insert
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < uniqueAssocs.length; i += batchSize) {
    const batch = uniqueAssocs.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('crm_deal_contacts')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`Error inserting batch:`, error);
    } else {
      inserted += data.length;
    }
  }
  
  console.log('\n━'.repeat(50));
  console.log(`✅ Linking complete!`);
  console.log(`   Associations created: ${inserted}`);
  console.log(`   Matched: ${matched}, Unmatched: ${unmatched}`);
  console.log('━'.repeat(50));
}

main().catch(console.error);
