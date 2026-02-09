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
  Calendar as CalendarIcon,
  BarChart3,
  PieChart
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface WeeklyMovement {
  id: string;
  name: string;
  stageFrom: string;
  stageTo: string;
  date: string;
}

interface StuckDeal {
  id: string;
  name: string;
  stage: string;
  amount: number;
  daysSinceActivity: number;
  company?: string;
}

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

  // Pipeline review enhancements
  weeklyMovements: WeeklyMovement[];
  stuckDeals: StuckDeal[];
  revenueForecast: number;
  forecastByStage: { stage: string; value: number; weight: number; weighted: number }[];
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
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [dealsRes, contactsRes, companiesRes, stageChangesRes] = await Promise.all([
      supabase.from('crm_deals').select('*'),
      supabase.from('crm_contacts').select('id, created_at', { count: 'exact' }),
      supabase.from('crm_companies').select('id, created_at', { count: 'exact' }),
      supabase.from('crm_activities').select('deal_id, stage_from, stage_to, subject, created_at').eq('type', 'stage-change').gte('created_at', oneWeekAgo.toISOString()).order('created_at', { ascending: false }),
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

    // Weekly movements
    const weeklyMovements: WeeklyMovement[] = (stageChangesRes.data || []).map(a => ({
      id: a.deal_id,
      name: a.subject || '',
      stageFrom: a.stage_from || '',
      stageTo: a.stage_to || '',
      date: a.created_at,
    }));

    // Stuck deals (open deals with no activity in 5+ days)
    const now = new Date();
    const stuckDeals: StuckDeal[] = openDeals
      .map(d => {
        const lastActivity = d.last_activity_at || d.created_at;
        const daysSince = Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: d.id,
          name: d.name,
          stage: d.stage,
          amount: d.amount || 0,
          daysSinceActivity: daysSince,
          company: d.company_id,
        };
      })
      .filter(d => d.daysSinceActivity >= 5)
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
      .slice(0, 10);

    // Revenue forecast (weighted by stage)
    const stageWeights: Record<string, number> = {
      'new-lead': 0.10,
      'discovery-scheduled': 0.25,
      'discovery-complete': 0.25,
      'proposal-draft': 0.50,
      'proposal-sent': 0.50,
      'contract-sent': 0.75,
    };

    const forecastByStage = Object.entries(stageMap)
      .filter(([stage]) => !['closed-won', 'closed-lost', 'current-customer', 'dead', 'dead-deals'].includes(stage))
      .map(([stage, data]) => {
        const weight = stageWeights[stage] || 0.10;
        return {
          stage,
          value: data.value,
          weight,
          weighted: data.value * weight,
        };
      })
      .sort((a, b) => b.weighted - a.weighted);

    const revenueForecast = forecastByStage.reduce((sum, s) => sum + s.weighted, 0);

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
      avgDaysToClose: 0,
      totalContacts: contactsRes.count || 0,
      totalCompanies: companiesRes.count || 0,
      newContactsThisMonth,
      newCompaniesThisMonth,
      recentWins,
      weeklyMovements,
      stuckDeals,
      revenueForecast,
      forecastByStage,
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
      {/* Premium Header */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/30 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gradient-violet mb-2">Sales Analytics</h1>
            <p className="text-lg text-gray-600 font-medium">Track your performance and growth metrics</p>
          </div>
          
          {/* Premium Time Range Selector */}
          <div className="flex items-center bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 border border-white/30">
            {(['30d', '90d', '1y', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-3 text-sm font-semibold rounded-xl spring-transition ${
                  timeRange === range
                    ? 'bg-white shadow-lg text-violet-600 border border-violet-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                {range === 'all' ? 'All Time' : range === '1y' ? '1 Year' : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Open Pipeline */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/10 group-hover:from-violet-500/10 group-hover:to-purple-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 spring-transition">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{formatCurrency(data.totalPipelineValue)}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Open Pipeline</p>
            </div>
          </div>
        </div>

        {/* Won Revenue */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 group-hover:from-emerald-500/10 group-hover:to-teal-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 spring-transition">
                <Target className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{formatCurrency(data.wonValue)}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Won Revenue</p>
            </div>
          </div>
        </div>

        {/* Win Rate with Circular Progress */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/10 group-hover:from-blue-500/10 group-hover:to-cyan-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 spring-transition">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              {/* Win Rate Circle */}
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-gray-200"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-blue-500"
                    style={{
                      strokeDasharray: `${data.winRate * 1.005}, 100`,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">{data.winRate.toFixed(0)}%</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{data.winRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Win Rate</p>
            </div>
          </div>
        </div>

        {/* Average Deal Size */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/10 group-hover:from-orange-500/10 group-hover:to-red-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 spring-transition">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 font-semibold bg-orange-50 rounded-full border border-orange-200">
                <TrendingUp className="w-4 h-4" />
                +5%
              </div>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{formatCurrency(data.avgDealSize)}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Avg Deal Size</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-white/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Pipeline Distribution</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-xl">
              <PieChart className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-violet-700">By Stage</span>
            </div>
          </div>
          <div className="space-y-6">
            {data.dealsByStage.map((item, index) => {
              const percentage = ((item.value / data.totalPipelineValue) * 100).toFixed(1);
              return (
                <div key={item.stage} className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: STAGE_COLORS[item.stage] || '#71717a' }}
                      />
                      <span className="text-sm font-semibold text-gray-700 capitalize">
                        {item.stage.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(item.value)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full spring-transition group-hover:scale-y-110"
                      style={{ 
                        width: `${(item.value / maxStageValue) * 100}%`,
                        backgroundColor: STAGE_COLORS[item.stage] || '#71717a'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">{item.count} deals</span>
                    <span className="text-xs font-medium text-gray-600">{percentage}% of pipeline</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-white/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Lead Sources</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Performance</span>
            </div>
          </div>
          {data.dealsBySource.length > 0 ? (
            <div className="space-y-4">
              {data.dealsBySource.map((item, index) => {
                const sourceColors = [
                  'from-violet-500 to-purple-600',
                  'from-blue-500 to-cyan-600',
                  'from-emerald-500 to-teal-600',
                  'from-orange-500 to-red-500',
                  'from-pink-500 to-rose-600'
                ];
                const colorGradient = sourceColors[index % sourceColors.length];
                
                return (
                  <div key={item.source} className="group p-4 bg-white/50 rounded-2xl border border-white/30 hover:bg-white/70 spring-transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorGradient} flex items-center justify-center shadow-lg group-hover:scale-105 spring-transition`}>
                          <span className="text-white font-bold text-lg">
                            {item.source.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 capitalize">{item.source.replace(/-/g, ' ')}</p>
                          <p className="text-sm text-gray-500">{item.count} deals • {((item.count / data.dealsBySource.reduce((sum, s) => sum + s.count, 0)) * 100).toFixed(1)}% of deals</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-gray-500">Total value</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No source data yet</p>
            </div>
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

      {/* Revenue Forecast */}
      <div className="glass-card rounded-2xl p-6 border border-white/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">💰 Revenue Forecast</h2>
          <div className="text-right">
            <p className="text-3xl font-bold text-gradient-violet">{formatCurrency(data.revenueForecast)}</p>
            <p className="text-xs text-gray-500">Weighted pipeline</p>
          </div>
        </div>
        {data.forecastByStage.length > 0 ? (
          <div className="space-y-3">
            {data.forecastByStage.map((item) => (
              <div key={item.stage} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/30">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[item.stage] || '#71717a' }}
                  />
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.stage.replace(/-/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">{formatCurrency(item.value)}</span>
                  <span className="text-gray-400">×</span>
                  <span className="font-medium text-gray-600">{Math.round(item.weight * 100)}%</span>
                  <span className="text-gray-400">=</span>
                  <span className="font-bold text-gray-900">{formatCurrency(item.weighted)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No open deals to forecast</p>
        )}
      </div>

      {/* Weekly Movement + Stuck Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Movement */}
        <div className="glass-card rounded-2xl p-6 border border-white/30">
          <h2 className="text-xl font-bold text-gray-900 mb-6">📈 Weekly Movement</h2>
          {data.weeklyMovements.length > 0 ? (
            <div className="space-y-3">
              {data.weeklyMovements.slice(0, 10).map((m, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: STAGE_COLORS[m.stageFrom] || '#71717a' }}
                      >
                        {m.stageFrom.replace(/-/g, ' ')}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: STAGE_COLORS[m.stageTo] || '#71717a' }}
                      >
                        {m.stageTo.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No stage changes this week</p>
            </div>
          )}
        </div>

        {/* Stuck Deals */}
        <div className="glass-card rounded-2xl p-6 border border-white/30">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🚨 Stuck Deals</h2>
          {data.stuckDeals.length > 0 ? (
            <div className="space-y-3">
              {data.stuckDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{deal.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: STAGE_COLORS[deal.stage] || '#71717a' }}
                      >
                        {deal.stage.replace(/-/g, ' ')}
                      </span>
                      {deal.amount > 0 && (
                        <span className="text-xs text-gray-500">{formatCurrency(deal.amount)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                    {deal.daysSinceActivity}d idle
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">✅ No stuck deals — great work!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
