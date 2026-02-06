'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Calendar,
  ArrowRight,
  Activity,
  Target,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  totalDeals: number;
  totalValue: number;
  wonValue: number;
  openDeals: number;
  contactsCount: number;
  companiesCount: number;
  dealsByStage: Record<string, { count: number; value: number }>;
  recentActivities: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = createClient();

    const [dealsRes, contactsRes, companiesRes, activitiesRes] = await Promise.all([
      supabase.from('crm_deals').select('*'),
      supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
      supabase.from('crm_companies').select('id', { count: 'exact', head: true }),
      supabase.from('crm_activities').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    const deals = dealsRes.data || [];
    
    // Calculate stats
    const totalValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const wonDeals = deals.filter(d => d.stage === 'closed-won' || d.stage === 'current-customer');
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const openDeals = deals.filter(d => !['closed-won', 'closed-lost', 'dead', 'current-customer'].includes(d.stage));

    // Group by stage
    const dealsByStage: Record<string, { count: number; value: number }> = {};
    deals.forEach(deal => {
      if (!dealsByStage[deal.stage]) {
        dealsByStage[deal.stage] = { count: 0, value: 0 };
      }
      dealsByStage[deal.stage].count++;
      dealsByStage[deal.stage].value += deal.amount || 0;
    });

    setStats({
      totalDeals: deals.length,
      totalValue,
      wonValue,
      openDeals: openDeals.length,
      contactsCount: contactsRes.count || 0,
      companiesCount: companiesRes.count || 0,
      dealsByStage,
      recentActivities: activitiesRes.data || [],
    });

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s your sales overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Value */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-violet-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              12%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalValue || 0)}</p>
            <p className="text-sm text-gray-500">Pipeline Value</p>
          </div>
        </div>

        {/* Won Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              8%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.wonValue || 0)}</p>
            <p className="text-sm text-gray-500">Won Revenue</p>
          </div>
        </div>

        {/* Open Deals */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{stats?.openDeals || 0}</p>
            <p className="text-sm text-gray-500">Open Deals</p>
          </div>
        </div>

        {/* Contacts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-gray-900">{stats?.contactsCount || 0}</p>
            <p className="text-sm text-gray-500">Contacts</p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Summary */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Pipeline Overview</h2>
            <Link 
              href="/deals"
              className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {Object.entries(stats?.dealsByStage || {}).slice(0, 6).map(([stage, data]) => (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600 truncate capitalize">
                  {stage.replace(/-/g, ' ')}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 rounded-full"
                    style={{ 
                      width: `${Math.min((data.value / (stats?.totalValue || 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="text-sm font-medium text-gray-900 w-20 text-right">
                  {formatCurrency(data.value)}
                </div>
                <div className="text-sm text-gray-500 w-12 text-right">
                  {data.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/deals"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Create Deal</p>
                <p className="text-xs text-gray-500">Add a new opportunity</p>
              </div>
            </Link>
            <Link
              href="/contacts"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Add Contact</p>
                <p className="text-xs text-gray-500">New person to track</p>
              </div>
            </Link>
            <Link
              href="/companies"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Add Company</p>
                <p className="text-xs text-gray-500">New organization</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        
        {stats?.recentActivities && stats.recentActivities.length > 0 ? (
          <div className="space-y-4">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-900">{activity.subject || activity.type}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
