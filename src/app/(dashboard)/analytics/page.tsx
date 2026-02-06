'use client';

import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building2, 
  Target,
  Clock,
  ArrowRight,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AnalyticsData {
  // Pipeline metrics
  totalPipelineValue: number;
  wonValue: number;
  lostValue: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  avgDealSize: number;
  
  // By stage
  dealsByStage: { stage: string; count: number; value: number }[];
  
  // By source
  dealsBySource: { source: string; count: number; value: number }[];
  
  // Velocity
  avgDaysToClose: number;
  
  // Contacts & Companies
  totalContacts: number;
  totalCompanies: number;
  newContactsThisMonth: number;
  newCompaniesThisMonth: number;
  
  // Recent wins
  recentWins: { id: string; name: string; amount: number; company: string; closedAt: string }[];
}

const STAGE_COLORS: Record<string, string> = {
  'new-lead': '#8b5cf6',
  'discovery-scheduled': '#3b82f6',
  'discovery-complete': '#06b6d4',
  'proposal-draft': '#f59e0b',
  'proposal-sent': '#f97316',
  'contract-sent': '#ec4899',
  'closed-won': '#22c55e',
  'closed-lost': '#ef4444',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y' | 'all'>('all');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    const supabase = createClient();

    // Get date filter
    let dateFilter: Date | null = null;
    if (timeRange !== 'all') {
      dateFilter = new Date();
      if (timeRange === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
      else if (timeRange === '90d') dateFilter.setDate(dateFilter.getDate() - 90);
      else if (timeRange === '1y') dateFilter.setFullYear(dateFilter.getFullYear() - 1);
    }

    // Load all data
    const [dealsRes, contactsRes, companiesRes] = await Promise.all([
      supabase.from('crm_deals').select('*'),
      supabase.from('crm_contacts').select('id, created_at', { count: 'exact' }),
      supabase.from('crm_companies').select('id, created_at', { count: 'exact' }),
    ]);

    const deals = dealsRes.data || [];
    const contacts = contactsRes.data || [];
    const companies = companiesRes.data || [];

    // Filter by date if needed
    const filteredDeals = dateFilter 
      ? deals.filter(d => new Date(d.created_at) >= dateFilter!)
      : deals;

    // Calculate metrics
    const wonDeals = filteredDeals.filter(d => d.stage === 'closed-won' || d.stage === 'current-customer');
    const lostDeals = filteredDeals.filter(d => d.stage === 'closed-lost' || d.stage === 'dead');
    const openDeals = filteredDeals.filter(d => !['closed-won', 'closed-lost', 'current-customer', 'dead'].includes(d.stage));

    const totalPipelineValue = openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const lostValue = lostDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    const closedDeals = wonDeals.length + lostDeals.length;
    const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;
    const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;

    // Group by stage
    const stageMap: Record<string, { count: number; value: number }> = {};
    filteredDeals.forEach(deal => {
      if (!stageMap[deal.stage]) stageMap[deal.stage] = { count: 0, value: 0 };
      stageMap[deal.stage].count++;
      stageMap[deal.stage].value += deal.amount || 0;
    });
    const dealsByStage = Object.entries(stageMap)
      .map(([stage, data]) => ({ stage, ...data }))
      .sort((a, b) => b.value - a.value);

    // Group by source
    const sourceMap: Record<string, { count: number; value: number }> = {};
    filteredDeals.forEach(deal => {
      const source = deal.lead_source || 'Unknown';
      if (!sourceMap[source]) sourceMap[source] = { count: 0, value: 0 };
      sourceMap[source].count++;
      sourceMap[source].value += deal.amount || 0;
    });
    const dealsBySource = Object.entries(sourceMap)
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.value - a.value);

    // New this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newContactsThisMonth = contacts.filter(c => new Date(c.created_at) >= startOfMonth).length;
    const newCompaniesThisMonth = companies.filter(c => new Date(c.created_at) >= startOfMonth).length;

    // Recent wins
    const recentWins = wonDeals
      .sort((a, b) => new Date(b.closed_at || b.updated_at).getTime() - new Date(a.closed_at || a.updated_at).getTime())
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        name: d.name,
        amount: d.amount || 0,
        company: d.company_id || 'Unknown',
        closedAt: d.closed_at || d.updated_at,
      }));

    setData({
      totalPipelineValue,
      wonValue,
      lostValue,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      winRate,
      avgDealSize,
      dealsByStage,
      dealsBySource,
      avgDaysToClose: 0, // TODO: Calculate from actual close dates
      totalContacts: contactsRes.count || 0,
      totalCompanies: companiesRes.count || 0,
      newContactsThisMonth,
      newCompaniesThisMonth,
      recentWins,
    });

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  if (!data) return null;

  const maxStageValue = Math.max(...data.dealsByStage.map(s => s.value), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Track your sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          {(['30d', '90d', '1y', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-violet-100 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range === 'all' ? 'All Time' : range === '1y' ? '1 Year' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalPipelineValue)}</p>
          <p className="text-sm text-gray-500">Open Pipeline</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.wonValue)}</p>
          <p className="text-sm text-gray-500">Won Revenue</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.winRate.toFixed(0)}%</p>
          <p className="text-sm text-gray-500">Win Rate</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.avgDealSize)}</p>
          <p className="text-sm text-gray-500">Avg Deal Size</p>
        </div>
      </div>

      {/* Pipeline by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline by Stage</h2>
          <div className="space-y-3">
            {data.dealsByStage.map((item) => (
              <div key={item.stage} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STAGE_COLORS[item.stage] || '#71717a' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize truncate">
                      {item.stage.replace(/-/g, ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(item.value / maxStageValue) * 100}%`,
                        backgroundColor: STAGE_COLORS[item.stage] || '#71717a'
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Deals by Source</h2>
          {data.dealsBySource.length > 0 ? (
            <div className="space-y-3">
              {data.dealsBySource.map((item) => (
                <div key={item.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {item.source.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {item.source.replace(/-/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">{item.count} deals</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No source data yet</p>
          )}
        </div>
      </div>

      {/* Deal Counts & Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-sm text-gray-600">Open Deals</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.openDeals}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Won Deals</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{data.wonDeals}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Total Contacts</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.totalContacts}</p>
          {data.newContactsThisMonth > 0 && (
            <p className="text-xs text-green-600 mt-1">+{data.newContactsThisMonth} this month</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Companies</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.totalCompanies}</p>
          {data.newCompaniesThisMonth > 0 && (
            <p className="text-xs text-green-600 mt-1">+{data.newCompaniesThisMonth} this month</p>
          )}
        </div>
      </div>

      {/* Recent Wins */}
      {data.recentWins.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Wins 🎉</h2>
          <div className="space-y-3">
            {data.recentWins.map((win) => (
              <div key={win.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{win.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(win.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {formatFullCurrency(win.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
