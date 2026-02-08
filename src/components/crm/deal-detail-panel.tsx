'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  User, 
  DollarSign, 
  Calendar, 
  Tag, 
  Clock,
  Mail,
  Phone,
  ExternalLink,
  Edit2,
  Trash2,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Send,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Trophy
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ComposeEmailDialog } from './compose-email-dialog';

interface Deal {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  amount: number | null;
  annual_contract_value: number | null;
  expected_close_date: string | null;
  close_date: string | null;
  closed_at: string | null;
  close_reason: string | null;
  company_id: string | null;
  primary_contact_id: string | null;
  priority: string;
  lead_source: string | null;
  lead_source_detail: string | null;
  deal_type: string | null;
  created_at: string;
  last_activity_at: string | null;
  // HubSpot fields
  probability?: number | null;
  weighted_amount?: number | null;
  monthly_recurring_revenue?: number | null;
  total_contract_value?: number | null;
  closed_won_reason?: string | null;
  closed_lost_reason?: string | null;
  dead_deal_reason?: string | null;
  next_step?: string | null;
  next_activity_date?: string | null;
  tags?: string[] | null;
  lead_type?: string | null;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
    website: string | null;
    industry: string | null;
  };
  contact?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    job_title: string | null;
  };
}

interface Activity {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  created_at: string;
}

interface DealDetailPanelProps {
  dealId: string;
  onClose: () => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  stages: { id: string; name: string; color: string; is_won?: boolean; is_lost?: boolean }[];
}

export function DealDetailPanel({ dealId, onClose, onEdit, onDelete, stages }: DealDetailPanelProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
  const [showComposeEmail, setShowComposeEmail] = useState(false);

  useEffect(() => {
    loadDeal();
  }, [dealId]);

  const loadDeal = async () => {
    const supabase = createClient();
    
    // Load deal with company and contact
    const { data: dealData } = await supabase
      .from('crm_deals')
      .select(`
        *,
        company:crm_companies(id, name, logo_url, website, industry),
        contact:crm_contacts(id, first_name, last_name, email, phone, job_title)
      `)
      .eq('id', dealId)
      .single();

    // Load activities
    const { data: activitiesData } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (dealData) setDeal(dealData);
    if (activitiesData) setActivities(activitiesData);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStage = (stageId: string) => {
    return stages.find(s => s.id === stageId);
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-xl flex items-center justify-center">
          <p className="text-gray-500">Deal not found</p>
        </div>
      </div>
    );
  }

  const stage = getStage(deal.stage);
  const isClosedWon = stage?.is_won || deal.stage === 'closed-won';
  const isClosedLost = stage?.is_lost || deal.stage === 'closed-lost';
  const isDead = deal.stage === 'dead' || deal.stage === 'dead-deals';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop - hidden on mobile since panel is full-screen */}
      <div className="absolute inset-0 bg-black/50 hidden md:block" onClick={onClose} />
      
      {/* Panel - full screen on mobile, slide-in on desktop */}
      <div className="absolute inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-xl bg-white shadow-xl flex flex-col animate-in slide-in-from-right md:slide-in-from-right duration-200 slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-start justify-between p-4 md:p-6 border-b border-gray-200 safe-area-pt">
          {/* Mobile back button */}
          <button 
            onClick={onClose}
            className="md:hidden p-2 -ml-2 mr-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 active:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {stage && (
                <span 
                  className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: stage.color }}
                >
                  {stage.name}
                </span>
              )}
              {deal.priority && deal.priority !== 'medium' && (
                <span className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium',
                  priorityColors[deal.priority as keyof typeof priorityColors]
                )}>
                  {deal.priority}
                </span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 line-clamp-2">{deal.name}</h2>
            {deal.company && (
              <p className="text-sm text-gray-500 mt-1">{deal.company.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {onEdit && (
              <button 
                onClick={() => onEdit(deal)}
                className="p-2.5 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50 active:bg-violet-100"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => {
                  if (confirm('Delete this deal?')) {
                    onDelete(deal);
                    onClose();
                  }
                }}
                className="p-2.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 active:bg-red-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            {/* Desktop close button */}
            <button 
              onClick={onClose}
              className="hidden md:block p-2.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'notes'
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            Notes & Activity ({activities.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-safe">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Closed Won Reason */}
              {isClosedWon && deal.closed_won_reason && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <Trophy className="w-5 h-5" />
                    <span className="font-medium">Why We Won</span>
                  </div>
                  <p className="text-sm text-green-800">{deal.closed_won_reason}</p>
                </div>
              )}

              {/* Closed Lost Reason */}
              {isClosedLost && deal.closed_lost_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Why We Lost</span>
                  </div>
                  <p className="text-sm text-red-800">{deal.closed_lost_reason}</p>
                </div>
              )}

              {/* Dead Deal Reason */}
              {isDead && deal.dead_deal_reason && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Why Deal Went Dead</span>
                  </div>
                  <p className="text-sm text-gray-700">{deal.dead_deal_reason}</p>
                </div>
              )}

              {/* Next Step */}
              {deal.next_step && (
                <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
                  <div className="flex items-center gap-2 text-violet-700 mb-2">
                    <ArrowRight className="w-5 h-5" />
                    <span className="font-medium">Next Step</span>
                    {deal.next_activity_date && (
                      <span className="text-xs text-violet-500 ml-auto">
                        Due: {formatDate(deal.next_activity_date)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-violet-800">{deal.next_step}</p>
                </div>
              )}

              {/* Amount & Probability */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Deal Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {deal.amount ? formatCurrency(deal.amount) : 'Not set'}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      {deal.probability !== null && deal.probability !== undefined && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {Math.round(deal.probability * 100)}% probability
                        </span>
                      )}
                      {deal.weighted_amount && (
                        <span>
                          Weighted: {formatCurrency(deal.weighted_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Metrics */}
              {(deal.monthly_recurring_revenue || deal.total_contract_value || deal.annual_contract_value) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {deal.monthly_recurring_revenue && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">MRR</p>
                      <p className="text-lg font-bold text-blue-900">
                        {formatCurrency(deal.monthly_recurring_revenue)}
                      </p>
                    </div>
                  )}
                  {deal.annual_contract_value && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-purple-600 font-medium">ACV</p>
                      <p className="text-lg font-bold text-purple-900">
                        {formatCurrency(deal.annual_contract_value)}
                      </p>
                    </div>
                  )}
                  {deal.total_contract_value && (
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-xs text-indigo-600 font-medium">TCV</p>
                      <p className="text-lg font-bold text-indigo-900">
                        {formatCurrency(deal.total_contract_value)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {deal.tags && deal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {deal.tags.map((tag, i) => (
                    <span 
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Key Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Expected Close</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {deal.expected_close_date ? formatDate(deal.expected_close_date) : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Created</span>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatDate(deal.created_at)}
                  </p>
                </div>
              </div>

              {/* Company */}
              {deal.company && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{deal.company.name}</p>
                      {deal.company.industry && (
                        <p className="text-sm text-gray-500">{deal.company.industry}</p>
                      )}
                    </div>
                    {deal.company.website && (
                      <a 
                        href={deal.company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-violet-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Contact */}
              {deal.contact && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-violet-600">
                        {deal.contact.first_name[0]}{deal.contact.last_name?.[0] || ''}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {deal.contact.first_name} {deal.contact.last_name}
                      </p>
                      {deal.contact.job_title && (
                        <p className="text-sm text-gray-500">{deal.contact.job_title}</p>
                      )}
                    </div>
                  </div>
                  {(deal.contact.email || deal.contact.phone) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
                      {deal.contact.email && (
                        <button 
                          onClick={() => setShowComposeEmail(true)}
                          className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium"
                        >
                          <Send className="w-4 h-4" />
                          Send Email
                        </button>
                      )}
                      {deal.contact.email && (
                        <a 
                          href={`mailto:${deal.contact.email}`}
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-violet-600"
                        >
                          <Mail className="w-4 h-4" />
                          {deal.contact.email}
                        </a>
                      )}
                      {deal.contact.phone && (
                        <a 
                          href={`tel:${deal.contact.phone}`}
                          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-violet-600"
                        >
                          <Phone className="w-4 h-4" />
                          {deal.contact.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Additional Info */}
              <div className="space-y-3">
                {deal.deal_type && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Deal Type</span>
                    <span className="text-sm font-medium text-gray-900">{deal.deal_type}</span>
                  </div>
                )}
                {deal.lead_type && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Lead Type</span>
                    <span className="text-sm font-medium text-gray-900">{deal.lead_type}</span>
                  </div>
                )}
                {deal.lead_source && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Lead Source</span>
                    <span className="text-sm font-medium text-gray-900">{deal.lead_source}</span>
                  </div>
                )}
                {deal.close_reason && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Close Reason</span>
                    <span className="text-sm font-medium text-gray-900">{deal.close_reason}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {deal.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                    {deal.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notes or activity yet</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-600 capitalize">
                        {activity.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDateTime(activity.created_at)}
                      </span>
                    </div>
                    {activity.subject && (
                      <h4 className="font-medium text-gray-900 mb-1">{activity.subject}</h4>
                    )}
                    {activity.body && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {activity.body}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Dialog */}
      {showComposeEmail && deal?.contact?.email && (
        <ComposeEmailDialog
          to={deal.contact.email}
          toName={`${deal.contact.first_name} ${deal.contact.last_name || ''}`}
          dealId={deal.id}
          contactId={deal.contact.id}
          onClose={() => setShowComposeEmail(false)}
          onSent={() => {
            // Reload activities to show the sent email
            loadDeal();
          }}
        />
      )}
    </div>
  );
}
