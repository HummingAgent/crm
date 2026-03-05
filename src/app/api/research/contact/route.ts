import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createAzure } from '@ai-sdk/azure';

// Initialize Azure OpenAI
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE || 'humming-agent-foundry-dev',
  apiKey: process.env.AZURE_OPENAI_API_KEY?.trim(),
});

interface ContactResearch {
  summary: string;
  linkedin_insights: string | null;
  company_insights: string | null;
  pain_points: string[];
  talking_points: string[];
  recommended_approach: string;
  researched_at: string;
}

// Research a single contact using AI + web data
async function researchContact(contact: {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  company?: {
    name: string;
    website: string | null;
    industry: string | null;
    description: string | null;
  } | null;
}): Promise<ContactResearch> {
  const fullName = `${contact.first_name} ${contact.last_name || ''}`.trim();
  const companyName = contact.company?.name || 'Unknown Company';
  const industry = contact.company?.industry || 'Unknown Industry';
  
  // Build context for AI research
  const context = `
Contact: ${fullName}
Title: ${contact.job_title || 'Unknown'}
Company: ${companyName}
Industry: ${industry}
Company Website: ${contact.company?.website || 'N/A'}
Company Description: ${contact.company?.description || 'N/A'}
LinkedIn: ${contact.linkedin_url || 'N/A'}
Email Domain: ${contact.email ? contact.email.split('@')[1] : 'N/A'}
  `.trim();

  const prompt = `You are a sales intelligence researcher. Analyze this contact and provide actionable insights for a sales team.

${context}

Based on this information, provide:
1. A brief professional summary (2-3 sentences about who they likely are and their role)
2. Key insights about their company and position
3. 3-5 likely pain points based on their role and industry
4. 3-5 specific talking points to engage them
5. Recommended outreach approach (tone, channel, timing)

Be specific and actionable. Focus on what would help a salesperson have a meaningful conversation.

Format your response as JSON:
{
  "summary": "...",
  "linkedin_insights": "...",
  "company_insights": "...",
  "pain_points": ["...", "..."],
  "talking_points": ["...", "..."],
  "recommended_approach": "..."
}`;

  try {
    const { text } = await generateText({
      model: azure(process.env.AZURE_OPENAI_DEPLOYMENT?.trim() || 'gpt-5.2'),
      prompt,
      temperature: 0.7,
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const research = JSON.parse(jsonMatch[0]);
      return {
        ...research,
        researched_at: new Date().toISOString(),
      };
    }

    // Fallback if JSON parsing fails
    return {
      summary: text.slice(0, 500),
      linkedin_insights: null,
      company_insights: null,
      pain_points: [],
      talking_points: [],
      recommended_approach: 'Standard professional outreach recommended.',
      researched_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('AI research error:', error);
    return {
      summary: `${fullName} is a ${contact.job_title || 'professional'} at ${companyName}.`,
      linkedin_insights: null,
      company_insights: null,
      pain_points: [],
      talking_points: [],
      recommended_approach: 'Research pending - try again later.',
      researched_at: new Date().toISOString(),
    };
  }
}

// POST: Research one or more contacts
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { contactIds, all = false } = body;

    let contactsToResearch: string[] = [];

    if (all) {
      // Get all contacts that haven't been researched recently (7+ days ago or never)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: contacts } = await supabase
        .from('crm_contacts')
        .select('id')
        .or(`research_data.is.null,last_researched_at.lt.${sevenDaysAgo}`)
        .limit(50); // Batch limit

      contactsToResearch = (contacts || []).map(c => c.id);
    } else if (contactIds && contactIds.length > 0) {
      contactsToResearch = contactIds;
    } else {
      return NextResponse.json({ error: 'No contacts specified' }, { status: 400 });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const contactId of contactsToResearch) {
      try {
        // Fetch contact with company
        const { data: contact, error: fetchError } = await supabase
          .from('crm_contacts')
          .select(`
            id, first_name, last_name, email, job_title, linkedin_url,
            company:crm_companies(name, website, industry, description)
          `)
          .eq('id', contactId)
          .single();

        if (fetchError || !contact) {
          results.push({ id: contactId, success: false, error: 'Contact not found' });
          continue;
        }

        // Research the contact
        const research = await researchContact({
          ...contact,
          company: contact.company as { name: string; website: string | null; industry: string | null; description: string | null } | null,
        });

        // Save research data
        const { error: updateError } = await supabase
          .from('crm_contacts')
          .update({
            research_data: research,
            last_researched_at: new Date().toISOString(),
          })
          .eq('id', contactId);

        if (updateError) {
          results.push({ id: contactId, success: false, error: updateError.message });
        } else {
          results.push({ id: contactId, success: true });
        }
      } catch (err) {
        results.push({ id: contactId, success: false, error: String(err) });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Researched ${successful} contacts, ${failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json({ error: 'Research failed' }, { status: 500 });
  }
}

// GET: Get research for a specific contact
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('id');

  if (!contactId) {
    return NextResponse.json({ error: 'Missing contact id' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('crm_contacts')
    .select('id, first_name, last_name, research_data, last_researched_at')
    .eq('id', contactId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
