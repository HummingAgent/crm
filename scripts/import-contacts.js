#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CSV with proper quote handling
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
        i++; // Skip next quote
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
        if (char === '\r') i++; // Skip \n after \r
      } else {
        currentField += char;
      }
    }
  }
  
  // Don't forget last line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }
  
  return lines;
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'docs', 'hubspot-contacts-export.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  if (rows.length < 2) {
    console.error('No data rows found');
    process.exit(1);
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  // Find column indices
  const getIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
  
  const colMap = {
    recordId: getIndex('Record ID'),
    firstName: getIndex('First Name'),
    lastName: getIndex('Last Name'),
    email: getIndex('Email'),
    phone: getIndex('Phone Number'),
    mobile: getIndex('Mobile Phone Number'),
    jobTitle: getIndex('Job Title'),
    companyName: getIndex('Company Name'),
    city: getIndex('City'),
    state: getIndex('State/Region'),
    linkedin: getIndex('LinkedIn URL'),
    leadSource: getIndex('Original Traffic Source'),
    owner: getIndex('Contact owner'),
  };
  
  console.log('Column mapping:', colMap);
  console.log(`Found ${dataRows.length} contacts to import`);
  
  // Step 1: Clear existing contacts (and deal_contacts junction)
  console.log('\n🗑️  Clearing existing contacts...');
  
  const { error: junctionError } = await supabase
    .from('crm_deal_contacts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (junctionError) {
    console.log('Note: Could not clear deal_contacts (may not exist):', junctionError.message);
  }
  
  const { error: deleteError } = await supabase
    .from('crm_contacts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.error('Error deleting contacts:', deleteError);
    process.exit(1);
  }
  
  console.log('✅ Cleared existing contacts');
  
  // Step 2: Get existing companies for matching
  const { data: existingCompanies } = await supabase
    .from('crm_companies')
    .select('id, name');
  
  const companyMap = new Map();
  (existingCompanies || []).forEach(c => {
    companyMap.set(c.name.toLowerCase().trim(), c.id);
  });
  
  // Step 3: Collect unique new companies
  const newCompanies = new Set();
  dataRows.forEach(row => {
    const companyName = row[colMap.companyName]?.trim();
    if (companyName && !companyMap.has(companyName.toLowerCase())) {
      newCompanies.add(companyName);
    }
  });
  
  // Step 4: Create new companies
  if (newCompanies.size > 0) {
    console.log(`\n🏢 Creating ${newCompanies.size} new companies...`);
    
    const companiesToInsert = Array.from(newCompanies).map(name => ({
      name: name
    }));
    
    const { data: insertedCompanies, error: companyError } = await supabase
      .from('crm_companies')
      .insert(companiesToInsert)
      .select('id, name');
    
    if (companyError) {
      console.error('Error creating companies:', companyError);
    } else {
      insertedCompanies.forEach(c => {
        companyMap.set(c.name.toLowerCase().trim(), c.id);
      });
      console.log(`✅ Created ${insertedCompanies.length} companies`);
    }
  }
  
  // Step 5: Prepare contacts for insert
  const contacts = [];
  let skipped = 0;
  
  for (const row of dataRows) {
    const firstName = row[colMap.firstName]?.trim();
    const lastName = row[colMap.lastName]?.trim();
    const email = row[colMap.email]?.trim();
    
    // Skip if no name and no email
    if (!firstName && !lastName && !email) {
      skipped++;
      continue;
    }
    
    const companyName = row[colMap.companyName]?.trim();
    const companyId = companyName ? companyMap.get(companyName.toLowerCase()) : null;
    
    contacts.push({
      first_name: firstName || email?.split('@')[0] || 'Unknown',
      last_name: lastName || null,
      email: email || null,
      phone: row[colMap.phone]?.trim() || null,
      mobile: row[colMap.mobile]?.trim() || null,
      job_title: row[colMap.jobTitle]?.trim() || null,
      company_id: companyId,
      linkedin_url: row[colMap.linkedin]?.trim() || null,
      lead_source: row[colMap.leadSource]?.trim() || null,
    });
  }
  
  console.log(`\n👤 Importing ${contacts.length} contacts (skipped ${skipped} empty rows)...`);
  
  // Step 6: Batch insert contacts
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('crm_contacts')
      .insert(batch)
      .select('id');
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += data.length;
      process.stdout.write(`\r  Inserted: ${inserted}/${contacts.length}`);
    }
  }
  
  console.log('\n');
  console.log('━'.repeat(50));
  console.log(`✅ Import complete!`);
  console.log(`   Contacts imported: ${inserted}`);
  console.log(`   Companies created: ${newCompanies.size}`);
  console.log(`   Rows skipped: ${skipped}`);
  console.log('━'.repeat(50));
}

main().catch(console.error);
