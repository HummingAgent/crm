import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createApolloClient, apolloContactToCRM } from '@/lib/apollo';

// Import contacts from Apollo search or saved list
export async function POST(request: NextRequest) {
  try {
    const apollo = createApolloClient();
    
    if (!apollo) {
      return NextResponse.json({ 
        error: 'Apollo API not configured. Add APOLLO_API_KEY to environment.' 
      }, { status: 400 });
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const { 
      type = 'search', // 'search' or 'list'
      listId,
      searchParams,
      pipelineId, // Optional: create deals in this pipeline
      createDeals = false,
    } = body;

    let apolloContacts: any[] = [];

    if (type === 'list' && listId) {
      // Import from saved Apollo list
      const result = await apollo.getSavedList(listId);
      apolloContacts = result.contacts || [];
    } else if (type === 'search' && searchParams) {
      // Import from search
      const result = await apollo.searchPeople(searchParams);
      apolloContacts = result.contacts || [];
    } else {
      return NextResponse.json({ error: 'Invalid import type or missing parameters' }, { status: 400 });
    }

    const imported: { contacts: number; companies: number; deals: number } = {
      contacts: 0,
      companies: 0,
      deals: 0,
    };
    const errors: string[] = [];

    for (const apolloContact of apolloContacts) {
      try {
        const contactData = apolloContactToCRM(apolloContact);
        
        // Check if contact already exists by email
        if (contactData.email) {
          const { data: existing } = await supabase
            .from('crm_contacts')
            .select('id')
            .eq('email', contactData.email)
            .single();

          if (existing) {
            continue; // Skip duplicates
          }
        }

        let companyId: string | null = null;

        // Create or find company
        if (contactData.company_data) {
          // Check if company exists by name
          const { data: existingCompany } = await supabase
            .from('crm_companies')
            .select('id')
            .ilike('name', contactData.company_data.name)
            .single();

          if (existingCompany) {
            companyId = existingCompany.id;
          } else {
            // Create new company
            const { data: newCompany, error: companyError } = await supabase
              .from('crm_companies')
              .insert({
                name: contactData.company_data.name,
                website: contactData.company_data.website,
                linkedin_url: contactData.company_data.linkedin_url,
                industry: contactData.company_data.industry,
                employee_count: contactData.company_data.employee_count,
                logo_url: contactData.company_data.logo_url,
              })
              .select('id')
              .single();

            if (newCompany) {
              companyId = newCompany.id;
              imported.companies++;
            } else if (companyError) {
              errors.push(`Company ${contactData.company_data.name}: ${companyError.message}`);
            }
          }
        }

        // Create contact
        const { data: newContact, error: contactError } = await supabase
          .from('crm_contacts')
          .insert({
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            email: contactData.email,
            job_title: contactData.job_title,
            linkedin_url: contactData.linkedin_url,
            phone: contactData.phone,
            location: contactData.location,
            lead_source: contactData.lead_source,
            company_id: companyId,
            status: 'new',
          })
          .select('id')
          .single();

        if (newContact) {
          imported.contacts++;

          // Create deal if requested
          if (createDeals && pipelineId) {
            // Get first stage of pipeline
            const { data: firstStage } = await supabase
              .from('crm_pipeline_stages')
              .select('id')
              .eq('pipeline_id', pipelineId)
              .order('position')
              .limit(1)
              .single();

            if (firstStage) {
              const { error: dealError } = await supabase
                .from('crm_deals')
                .insert({
                  name: `${contactData.first_name} ${contactData.last_name || ''} - ${contactData.company_data?.name || 'New Lead'}`.trim(),
                  stage: firstStage.id,
                  pipeline_id: pipelineId,
                  primary_contact_id: newContact.id,
                  company_id: companyId,
                  lead_source: 'apollo',
                  priority: 'medium',
                });

              if (!dealError) {
                imported.deals++;
              }
            }
          }
        } else if (contactError) {
          errors.push(`Contact ${contactData.email}: ${contactError.message}`);
        }
      } catch (err) {
        errors.push(`Error processing contact: ${String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${imported.contacts} contacts, ${imported.companies} companies, ${imported.deals} deals`,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Apollo import error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET: Search Apollo without importing
export async function GET(request: NextRequest) {
  const apollo = createApolloClient();
  
  if (!apollo) {
    return NextResponse.json({ 
      error: 'Apollo API not configured' 
    }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  const titles = searchParams.get('titles')?.split(',');
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const result = await apollo.searchPeople({
      q_organization_name: company || undefined,
      person_titles: titles,
      page,
      per_page: 25,
    });

    return NextResponse.json({
      contacts: result.contacts.map(apolloContactToCRM),
      pagination: result.pagination,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
