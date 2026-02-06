'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Globe,
  Users,
  DollarSign,
  MapPin,
  Building2,
  ArrowUpDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NewCompanyDialog } from '@/components/crm/new-company-dialog';
import { CompanyDetailPanel } from '@/components/crm/company-detail-panel';

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  linkedin_url: string | null;
  created_at: string;
  contacts_count?: number;
  deals_count?: number;
  total_deal_value?: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const supabase = createClient();
    
    // Get companies with contact and deal counts
    const { data: companiesData, error } = await supabase
      .from('crm_companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (companiesData) {
      // Get counts for each company
      const companiesWithCounts = await Promise.all(
        companiesData.map(async (company) => {
          const [contactsRes, dealsRes] = await Promise.all([
            supabase
              .from('crm_contacts')
              .select('id', { count: 'exact', head: true })
              .eq('company_id', company.id),
            supabase
              .from('crm_deals')
              .select('id, amount')
              .eq('company_id', company.id),
          ]);

          const deals = dealsRes.data || [];
          const totalValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

          return {
            ...company,
            contacts_count: contactsRes.count || 0,
            deals_count: deals.length,
            total_deal_value: totalValue,
          };
        })
      );

      setCompanies(companiesWithCounts);
    }
    setLoading(false);
  };

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      (company.domain?.toLowerCase().includes(query)) ||
      (company.industry?.toLowerCase().includes(query))
    );
  });

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">{companies.length} companies</p>
        </div>
        <button 
          onClick={() => setShowNewCompany(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            onClick={() => setSelectedCompany(company)}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{company.name}</h3>
                  {company.domain && (
                    <p className="text-sm text-gray-500">{company.domain}</p>
                  )}
                </div>
              </div>
              <button 
                className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
              {company.industry && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{company.industry}</span>
                </div>
              )}
              {company.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {company.location}
                </div>
              )}
              {company.size && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  {company.size} employees
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{company.contacts_count}</p>
                  <p className="text-xs text-gray-500">Contacts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{company.deals_count}</p>
                  <p className="text-xs text-gray-500">Deals</p>
                </div>
              </div>
              {company.total_deal_value ? (
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(company.total_deal_value)}</p>
                  <p className="text-xs text-gray-500">Pipeline</p>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No companies found</p>
          <button 
            onClick={() => setShowNewCompany(true)}
            className="mt-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
          >
            Add your first company
          </button>
        </div>
      )}

      {/* New Company Dialog */}
      {showNewCompany && (
        <NewCompanyDialog
          onClose={() => setShowNewCompany(false)}
          onCreated={(newCompany) => {
            setCompanies(prev => [{ ...newCompany, contacts_count: 0, deals_count: 0, total_deal_value: 0 }, ...prev]);
            setShowNewCompany(false);
          }}
        />
      )}

      {/* Company Detail Panel */}
      {selectedCompany && (
        <CompanyDetailPanel
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onUpdated={(updated) => {
            setCompanies(prev => prev.map(c => c.id === updated.id ? { ...updated, contacts_count: c.contacts_count, deals_count: c.deals_count, total_deal_value: c.total_deal_value } : c));
            setSelectedCompany({ ...selectedCompany, ...updated });
          }}
          onDeleted={() => {
            setCompanies(prev => prev.filter(c => c.id !== selectedCompany.id));
            setSelectedCompany(null);
          }}
        />
      )}
    </div>
  );
}
