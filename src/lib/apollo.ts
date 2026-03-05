// Apollo.io API Integration
// Docs: https://apolloio.github.io/apollo-api-docs/

const APOLLO_API_BASE = 'https://api.apollo.io/v1';

interface ApolloConfig {
  apiKey: string;
}

interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string | null;
  title: string | null;
  linkedin_url: string | null;
  phone_numbers: { raw_number: string; type: string }[];
  organization: {
    id: string;
    name: string;
    website_url: string | null;
    linkedin_url: string | null;
    industry: string | null;
    estimated_num_employees: number | null;
    annual_revenue: number | null;
    logo_url: string | null;
  } | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface ApolloSearchResult {
  contacts: ApolloContact[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export class ApolloClient {
  private apiKey: string;

  constructor(config: ApolloConfig) {
    this.apiKey = config.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${APOLLO_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Apollo API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Search for people/contacts
  async searchPeople(params: {
    q_organization_name?: string;
    q_keywords?: string;
    person_titles?: string[];
    person_seniorities?: string[];
    organization_locations?: string[];
    organization_industry_tag_ids?: string[];
    page?: number;
    per_page?: number;
  }): Promise<ApolloSearchResult> {
    return this.request<ApolloSearchResult>('/mixed_people/search', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        page: params.page || 1,
        per_page: params.per_page || 25,
      }),
    });
  }

  // Enrich a person by email
  async enrichPerson(email: string): Promise<ApolloContact | null> {
    try {
      const result = await this.request<{ person: ApolloContact }>('/people/match', {
        method: 'POST',
        body: JSON.stringify({
          email,
          reveal_personal_emails: true,
        }),
      });
      return result.person || null;
    } catch {
      return null;
    }
  }

  // Enrich a company by domain
  async enrichCompany(domain: string): Promise<ApolloContact['organization'] | null> {
    try {
      const result = await this.request<{ organization: ApolloContact['organization'] }>('/organizations/enrich', {
        method: 'GET',
        body: JSON.stringify({ domain }),
      });
      return result.organization || null;
    } catch {
      return null;
    }
  }

  // Get a saved list
  async getSavedList(listId: string): Promise<{ contacts: ApolloContact[] }> {
    return this.request<{ contacts: ApolloContact[] }>(`/labels/${listId}/contacts`);
  }
}

// Create Apollo client from env
export function createApolloClient(): ApolloClient | null {
  const apiKey = process.env.APOLLO_API_KEY?.trim();
  
  if (!apiKey) {
    console.warn('APOLLO_API_KEY not configured');
    return null;
  }

  return new ApolloClient({ apiKey });
}

// Convert Apollo contact to CRM format
export function apolloContactToCRM(contact: ApolloContact) {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    job_title: contact.title,
    linkedin_url: contact.linkedin_url,
    phone: contact.phone_numbers?.[0]?.raw_number || null,
    location: [contact.city, contact.state, contact.country].filter(Boolean).join(', ') || null,
    lead_source: 'apollo',
    company_data: contact.organization ? {
      name: contact.organization.name,
      website: contact.organization.website_url,
      linkedin_url: contact.organization.linkedin_url,
      industry: contact.organization.industry,
      employee_count: contact.organization.estimated_num_employees,
      logo_url: contact.organization.logo_url,
    } : null,
  };
}
