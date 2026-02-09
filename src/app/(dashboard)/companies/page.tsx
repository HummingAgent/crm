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
import { EditCompanyDialog } from '@/components/crm/edit-company-dialog';

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
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

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
      {/* Premium Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gradient-violet">Companies</h1>
          <p className="text-lg text-gray-600 mt-2 font-medium">{companies.length} organizations in your portfolio</p>
        </div>
        <button 
          onClick={() => setShowNewCompany(true)}
          className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-2xl shadow-lg shadow-violet-500/25 spring-transition hover:scale-105 touch-feedback pulse-glow"
        >
          <Plus className="w-5 h-5" />
          Add Company
        </button>
      </div>

      {/* Premium Search & Filters */}
      <div className="glass-card rounded-2xl p-4 lg:p-6 border border-white/30 mb-8">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies by name, industry, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-sm bg-white/60 border border-white/30 rounded-2xl focus-ring-violet backdrop-blur-sm hover:bg-white/80 spring-transition"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white/60 border border-white/30 rounded-2xl hover:bg-white/80 spring-transition touch-feedback">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white/60 border border-white/30 rounded-2xl hover:bg-white/80 spring-transition touch-feedback">
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>
          </div>
        </div>
      </div>

      {/* Premium Company Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCompanies.map((company, index) => {
          // Industry-based color coding
          const industryColors: Record<string, string> = {
            'Technology': 'from-blue-500 to-cyan-600',
            'Healthcare': 'from-emerald-500 to-teal-600',
            'Finance': 'from-violet-500 to-purple-600',
            'Manufacturing': 'from-orange-500 to-red-500',
            'Retail': 'from-pink-500 to-rose-600',
            'Education': 'from-indigo-500 to-blue-600',
            'Real Estate': 'from-amber-500 to-yellow-600',
            'default': 'from-gray-500 to-slate-600'
          };
          
          const colorGradient = industryColors[company.industry || ''] || industryColors.default;
          
          return (
            <div
              key={company.id}
              onClick={() => setSelectedCompany(company)}
              className="glass-card rounded-2xl p-6 border border-white/30 cursor-pointer group hover:scale-[1.02] spring-transition touch-feedback"
            >
              {/* Premium Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {company.logo_url ? (
                    <img 
                      src={company.logo_url} 
                      alt={company.name} 
                      className="w-14 h-14 rounded-2xl object-cover shadow-lg group-hover:scale-105 spring-transition" 
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorGradient} flex items-center justify-center shadow-lg group-hover:scale-105 spring-transition`}>
                      <Building2 className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{company.name}</h3>
                    {company.domain && (
                      <p className="text-sm text-gray-500 font-medium line-clamp-1 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {company.domain}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl spring-transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Company Info */}
              <div className="space-y-3 mb-6">
                {company.industry && (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r ${colorGradient} rounded-full`}>
                      {company.industry}
                    </span>
                  </div>
                )}
                {company.location && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="font-medium">{company.location}</span>
                  </div>
                )}
                {company.size && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="font-medium">{company.size} employees</span>
                  </div>
                )}
              </div>

              {/* Premium Stats */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-2xl" />
                <div className="relative p-4 rounded-2xl border border-gray-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">{company.contacts_count}</p>
                      <p className="text-xs text-gray-500 font-medium">Contacts</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-2">
                        <DollarSign className="w-4 h-4 text-violet-600" />
                      </div>
                      <p className="text-xl font-bold text-gray-900">{company.deals_count}</p>
                      <p className="text-xs text-gray-500 font-medium">Deals</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-xl font-bold text-emerald-600">
                        {company.total_deal_value ? formatCurrency(company.total_deal_value) : '$0'}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">Pipeline</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="glass-card rounded-2xl p-12 lg:p-16 border border-white/30 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No companies found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 'Try adjusting your search terms' : "Build your company portfolio by adding your first organization"}
          </p>
          <button 
            onClick={() => setShowNewCompany(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-2xl shadow-lg shadow-violet-500/25 spring-transition hover:scale-105"
          >
            <Plus className="w-4 h-4" />
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
          onEdit={(company) => setEditingCompany(company)}
        />
      )}

      {editingCompany && (
        <EditCompanyDialog
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onUpdated={(updated) => {
            setCompanies(prev => prev.map(c => c.id === updated.id ? { ...updated, contacts_count: c.contacts_count, deals_count: c.deals_count, total_deal_value: c.total_deal_value } : c));
            if (selectedCompany?.id === updated.id) {
              setSelectedCompany({ ...selectedCompany, ...updated });
            }
            setEditingCompany(null);
          }}
        />
      )}
    </div>
  );
}
