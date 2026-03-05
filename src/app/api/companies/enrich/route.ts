import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Fetch company logo using Clearbit (free, no API key needed)
async function fetchCompanyLogo(domain: string): Promise<string | null> {
  try {
    // Clearbit Logo API (free, returns 404 if not found)
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const response = await fetch(logoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return logoUrl;
    }
    return null;
  } catch {
    return null;
  }
}

// Extract domain from website or email
function extractDomain(website: string | null, email?: string | null): string | null {
  if (website) {
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`);
      return url.hostname.replace('www.', '');
    } catch {
      // Try as plain domain
      return website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }
  }
  
  if (email) {
    const domain = email.split('@')[1];
    // Skip common email providers
    const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    if (domain && !commonProviders.includes(domain.toLowerCase())) {
      return domain;
    }
  }
  
  return null;
}

// POST: Enrich companies with logos and data
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { companyIds, all = false } = body;

    let companiesToEnrich: { id: string; name: string; website: string | null }[] = [];

    if (all) {
      // Get all companies without logos
      const { data: companies } = await supabase
        .from('crm_companies')
        .select('id, name, website')
        .is('logo_url', null)
        .limit(100);

      companiesToEnrich = companies || [];
    } else if (companyIds && companyIds.length > 0) {
      const { data: companies } = await supabase
        .from('crm_companies')
        .select('id, name, website')
        .in('id', companyIds);

      companiesToEnrich = companies || [];
    } else {
      return NextResponse.json({ error: 'No companies specified' }, { status: 400 });
    }

    const results: { id: string; name: string; logo: string | null; success: boolean }[] = [];

    for (const company of companiesToEnrich) {
      // Try to get domain from website or company name
      let domain = extractDomain(company.website, null);
      
      // If no website, try guessing from company name
      if (!domain && company.name) {
        // Clean company name and try as domain
        const cleanName = company.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .replace(/(inc|llc|corp|ltd|co)$/i, '');
        domain = `${cleanName}.com`;
      }

      let logoUrl: string | null = null;
      
      if (domain) {
        logoUrl = await fetchCompanyLogo(domain);
        
        // Try alternate domains if first attempt fails
        if (!logoUrl && company.name) {
          const altDomains = [
            `${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
            `${company.name.toLowerCase().replace(/\s+/g, '-')}.com`,
            `get${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
          ];
          
          for (const altDomain of altDomains) {
            logoUrl = await fetchCompanyLogo(altDomain);
            if (logoUrl) break;
          }
        }
      }

      if (logoUrl) {
        await supabase
          .from('crm_companies')
          .update({ logo_url: logoUrl })
          .eq('id', company.id);
      }

      results.push({
        id: company.id,
        name: company.name,
        logo: logoUrl,
        success: !!logoUrl,
      });
    }

    const found = results.filter(r => r.success).length;
    const notFound = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Found ${found} logos, ${notFound} not found`,
      results,
    });
  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 });
  }
}

// GET: Get enrichment status for a company
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('id');

  if (!companyId) {
    return NextResponse.json({ error: 'Missing company id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('crm_companies')
    .select('id, name, logo_url, website, linkedin_url, employee_count, annual_revenue')
    .eq('id', companyId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
