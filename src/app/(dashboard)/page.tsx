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
  Clock,
  Mail,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DueTodayDeal {
  id: string;
  name: string;
  next_action: string | null;
  next_action_type: string | null;
  next_action_date: string | null;
  amount: number | null;
  company: any;
}

interface UntouchedContact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  company: any;
  created_at: string;
}

interface DashboardStats {
  totalDeals: number;
  totalValue: number;
  wonValue: number;
  openDeals: number;
  contactsCount: number;
  companiesCount: number;
  dealsByStage: Record<string, { count: number; value: number }>;
  recentActivities: any[];
  dueTodayDeals: DueTodayDeal[];
  untouchedContacts: UntouchedContact[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = createClient();

    const today = new Date().toISOString().split('T')[0];

    const [dealsRes, contactsRes, companiesRes, activitiesRes, dueTodayRes, allContactsRes, dealContactsRes] = await Promise.all([
      supabase.from('crm_deals').select('*'),
      supabase.from('crm_contacts').select('id', { count: 'exact', head: true }),
      supabase.from('crm_companies').select('id', { count: 'exact', head: true }),
      supabase.from('crm_activities').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('crm_deals').select('id, name, next_action, next_action_type, next_action_date, amount, company:crm_companies(name)').lte('next_action_date', today).not('next_action_date', 'is', null).not('stage', 'in', '("closed-won","closed-lost","current-customer","dead","dead-deals")').order('next_action_date').limit(10),
      supabase.from('crm_contacts').select('id, first_name, last_name, email, created_at, company:crm_companies(name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('crm_deals').select('primary_contact_id'),
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

    // Find untouched contacts (not linked to any deal)
    const contactIdsWithDeals = new Set(
      (dealContactsRes.data || []).map(d => d.primary_contact_id).filter(Boolean)
    );
    const untouchedContacts = (allContactsRes.data || [])
      .filter(c => !contactIdsWithDeals.has(c.id))
      .slice(0, 5);

    setStats({
      totalDeals: deals.length,
      totalValue,
      wonValue,
      openDeals: openDeals.length,
      contactsCount: contactsRes.count || 0,
      companiesCount: companiesRes.count || 0,
      dealsByStage,
      recentActivities: activitiesRes.data || [],
      dueTodayDeals: (dueTodayRes.data || []) as DueTodayDeal[],
      untouchedContacts: untouchedContacts as UntouchedContact[],
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
      {/* Welcome Banner with Premium Styling */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-6 lg:p-8 mb-8 border border-white/30">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/25 float-animation">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gradient-violet mb-2">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return "Good morning";
                  if (hour < 17) return "Good afternoon";  
                  return "Good evening";
                })()}, Shawn! 👋
              </h1>
              <p className="text-lg text-gray-600 font-medium">Ready to crush your sales goals today?</p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid with Glass Morphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {/* Pipeline Value */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/10 group-hover:from-violet-500/10 group-hover:to-purple-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 spring-transition">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 font-semibold bg-emerald-50 rounded-full border border-emerald-200">
                <TrendingUp className="w-4 h-4" />
                +12%
              </span>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{formatCurrency(stats?.totalValue || 0)}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Total Pipeline Value</p>
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
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 font-semibold bg-emerald-50 rounded-full border border-emerald-200">
                <TrendingUp className="w-4 h-4" />
                +8%
              </span>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{formatCurrency(stats?.wonValue || 0)}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Won Revenue</p>
            </div>
          </div>
        </div>

        {/* Open Deals */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/10 group-hover:from-blue-500/10 group-hover:to-cyan-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 spring-transition">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 font-semibold bg-blue-50 rounded-full border border-blue-200">
                <Clock className="w-4 h-4" />
                Active
              </div>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{stats?.openDeals || 0}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Open Deals</p>
            </div>
          </div>
        </div>

        {/* Total Contacts */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/10 group-hover:from-orange-500/10 group-hover:to-red-500/15 spring-transition" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 spring-transition">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 font-semibold bg-orange-50 rounded-full border border-orange-200">
                <Building2 className="w-4 h-4" />
                {stats?.companiesCount || 0}
              </div>
            </div>
            <div>
              <p className="text-3xl lg:text-4xl font-bold text-gray-900 counter-animation">{stats?.contactsCount || 0}</p>
              <p className="text-sm text-gray-500 font-medium mt-2">Total Contacts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Pipeline & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
        {/* Premium Pipeline Overview */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 lg:p-8 border border-white/30">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">Pipeline Funnel</h2>
            <Link 
              href="/deals"
              className="flex items-center gap-2 px-4 py-2 text-sm text-violet-600 hover:text-violet-700 font-semibold bg-violet-50 hover:bg-violet-100 rounded-xl spring-transition border border-violet-200"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="space-y-6">
            {Object.entries(stats?.dealsByStage || {}).slice(0, 6).map(([stage, data], index) => {
              const percentage = Math.min((data.value / (stats?.totalValue || 1)) * 100, 100);
              const stageColors = [
                'from-violet-500 to-purple-600',
                'from-blue-500 to-cyan-600', 
                'from-emerald-500 to-teal-600',
                'from-orange-500 to-red-500',
                'from-pink-500 to-rose-600',
                'from-indigo-500 to-blue-600'
              ];
              
              return (
                <div key={stage} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700 capitalize">
                      {stage.replace(/-/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(data.value)}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {data.count} deals
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${stageColors[index]} rounded-full spring-transition group-hover:scale-y-110`}
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-xs font-medium text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Premium Quick Actions */}
        <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/deals"
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 spring-transition group border border-transparent hover:border-violet-200 touch-feedback"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 spring-transition">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Create Deal</p>
                <p className="text-xs text-gray-500">Add new opportunity</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-violet-500 spring-transition" />
            </Link>
            
            <Link
              href="/contacts"
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 spring-transition group border border-transparent hover:border-blue-200 touch-feedback"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 spring-transition">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Add Contact</p>
                <p className="text-xs text-gray-500">New person to track</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 spring-transition" />
            </Link>
            
            <Link
              href="/companies"
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 spring-transition group border border-transparent hover:border-orange-200 touch-feedback"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-105 spring-transition">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Add Company</p>
                <p className="text-xs text-gray-500">New organization</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 spring-transition" />
            </Link>
            
            <Link
              href="/calendar"
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 spring-transition group border border-transparent hover:border-emerald-200 touch-feedback"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 spring-transition">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Schedule Meeting</p>
                <p className="text-xs text-gray-500">Book a call</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 spring-transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* Due Today + Untouched Contacts */}
      {((stats?.dueTodayDeals && stats.dueTodayDeals.length > 0) || (stats?.untouchedContacts && stats.untouchedContacts.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          {/* Due Today */}
          {stats?.dueTodayDeals && stats.dueTodayDeals.length > 0 && (
            <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Due Today</h2>
                </div>
                <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  {stats.dueTodayDeals.length}
                </span>
              </div>
              <div className="space-y-3">
                {stats.dueTodayDeals.map((deal) => {
                  const typeIcons: Record<string, string> = { call: '📞', email: '✉️', meeting: '📹', demo: '🖥️' };
                  const icon = typeIcons[deal.next_action_type || ''] || '📋';
                  const isOverdue = deal.next_action_date && deal.next_action_date < new Date().toISOString().split('T')[0];
                  return (
                    <Link
                      key={deal.id}
                      href="/deals"
                      className={`flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 spring-transition border ${isOverdue ? 'border-red-200 bg-red-50/50' : 'border-transparent'}`}
                    >
                      <span className="text-lg">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{deal.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {deal.next_action || 'Follow up'}
                          {(deal.company as any)?.name ? ` • ${(deal.company as any).name}` : ''}
                        </p>
                      </div>
                      {deal.amount && (
                        <span className="text-xs font-bold text-gray-600">{formatCurrency(deal.amount)}</span>
                      )}
                      {isOverdue && (
                        <span className="text-xs font-semibold text-red-600">Overdue</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Untouched Contacts */}
          {stats?.untouchedContacts && stats.untouchedContacts.length > 0 && (
            <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-lg shadow-gray-500/25">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Untouched Contacts</h2>
                </div>
                <Link
                  href="/contacts"
                  className="text-sm text-violet-600 hover:text-violet-700 font-semibold"
                >
                  View all
                </Link>
              </div>
              <p className="text-xs text-gray-500 mb-4">Contacts not linked to any deal</p>
              <div className="space-y-3">
                {stats.untouchedContacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href="/contacts"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 spring-transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-sm flex-shrink-0">
                      {contact.first_name[0]}{contact.last_name?.[0] || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {contact.email || (contact.company as any)?.name || 'No details'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Premium Recent Activity */}
      <div className="glass-card rounded-2xl p-6 lg:p-8 border border-white/30">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-600">Live</span>
          </div>
        </div>
        
        {stats?.recentActivities && stats.recentActivities.length > 0 ? (
          <div className="space-y-6">
            {stats.recentActivities.map((activity, index) => {
              const activityTypes = {
                deal: { icon: DollarSign, color: 'from-violet-500 to-purple-600', bg: 'violet' },
                contact: { icon: Users, color: 'from-blue-500 to-cyan-600', bg: 'blue' },
                email: { icon: Mail, color: 'from-emerald-500 to-teal-600', bg: 'emerald' },
                meeting: { icon: Calendar, color: 'from-orange-500 to-red-500', bg: 'orange' },
                default: { icon: Activity, color: 'from-gray-400 to-gray-500', bg: 'gray' }
              };
              
              const activityType = activityTypes[activity.type as keyof typeof activityTypes] || activityTypes.default;
              const IconComponent = activityType.icon;
              
              return (
                <div key={activity.id} className="relative group">
                  {/* Timeline connector */}
                  {index < stats.recentActivities.length - 1 && (
                    <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activityType.color} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 spring-transition`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="p-4 rounded-2xl bg-white/50 border border-white/30 hover:bg-white/70 spring-transition">
                        <p className="font-medium text-gray-900 line-clamp-2">
                          {activity.subject || activity.type}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-gray-400" />
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-2">No recent activity</p>
            <p className="text-sm text-gray-400">Start creating deals and contacts to see your activity timeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
