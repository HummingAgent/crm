'use client';

import { useState, useEffect } from 'react';
import { X, Building2, User, DollarSign, Calendar, Loader2, TrendingUp, Target, Tag, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  is_won?: boolean;
  is_lost?: boolean;
}

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  company_id: string | null;
}

interface Deal {
  id: string;
  name: string;
  description?: string | null;
  stage: string;
  amount?: number | null;
  expected_close_date?: string | null;
  company_id?: string | null;
  primary_contact_id?: string | null;
  priority?: string | null;
  lead_source?: string | null;
  // HubSpot fields
  probability?: number | null;
  monthly_recurring_revenue?: number | null;
  total_contract_value?: number | null;
  closed_lost_reason?: string | null;
  closed_won_reason?: string | null;
  dead_deal_reason?: string | null;
  next_step?: string | null;
  next_activity_date?: string | null;
  tags?: string[] | null;
  lead_type?: string | null;
}

interface EditDealDialogProps {
  deal: Deal;
  onClose: () => void;
  onUpdated: (deal: any) => void;
  stages: PipelineStage[];
}

export function EditDealDialog({ deal, onClose, onUpdated, stages }: EditDealDialogProps) {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const currentStage = stages.find(s => s.id === deal.stage);
  const isClosedWon = currentStage?.is_won;
  const isClosedLost = currentStage?.is_lost;
  const isDead = deal.stage === 'dead' || deal.stage === 'dead-deals';

  const [formData, setFormData] = useState({
    name: deal.name || '',
    description: deal.description || '',
    stage: deal.stage || stages[0]?.id || 'new-lead',
    amount: deal.amount?.toString() || '',
    expected_close_date: deal.expected_close_date?.split('T')[0] || '',
    company_id: deal.company_id || '',
    primary_contact_id: deal.primary_contact_id || '',
    priority: deal.priority || 'medium',
    lead_source: deal.lead_source || '',
    // HubSpot fields
    probability: deal.probability?.toString() || '',
    monthly_recurring_revenue: deal.monthly_recurring_revenue?.toString() || '',
    total_contract_value: deal.total_contract_value?.toString() || '',
    closed_won_reason: deal.closed_won_reason || '',
    closed_lost_reason: deal.closed_lost_reason || '',
    dead_deal_reason: deal.dead_deal_reason || '',
    next_step: deal.next_step || '',
    next_activity_date: deal.next_activity_date?.split('T')[0] || '',
    tags: deal.tags || [],
    lead_type: deal.lead_type || '',
  });

  useEffect(() => {
    loadCompaniesAndContacts();
  }, []);

  useEffect(() => {
    if (formData.company_id) {
      setFilteredContacts(contacts.filter(c => c.company_id === formData.company_id));
    } else {
      setFilteredContacts(contacts);
    }
  }, [formData.company_id, contacts]);

  // Auto-update probability when stage changes
  useEffect(() => {
    const stageObj = stages.find(s => s.id === formData.stage);
    if (stageObj) {
      const stageProbabilities: Record<string, string> = {
        'new-lead': '10',
        'discovery-scheduled': '20',
        'discovery-complete': '40',
        'proposal-draft': '60',
        'proposal-sent': '75',
        'contract-sent': '90',
        'closed-won': '100',
        'closed-lost': '0',
        'dead': '0',
      };
      if (stageProbabilities[formData.stage] && !formData.probability) {
        setFormData(prev => ({ ...prev, probability: stageProbabilities[formData.stage] }));
      }
    }
  }, [formData.stage]);

  const loadCompaniesAndContacts = async () => {
    const supabase = createClient();
    
    const [companiesRes, contactsRes] = await Promise.all([
      supabase.from('crm_companies').select('id, name').order('name'),
      supabase.from('crm_contacts').select('id, first_name, last_name, email, company_id').order('first_name'),
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (contactsRes.data) {
      setContacts(contactsRes.data);
      setFilteredContacts(contactsRes.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    
    // Calculate weighted amount
    const amount = formData.amount ? parseFloat(formData.amount) : null;
    const probability = formData.probability ? parseFloat(formData.probability) / 100 : null;
    const weightedAmount = amount && probability ? amount * probability : null;

    const dealData = {
      name: formData.name,
      description: formData.description || null,
      stage: formData.stage,
      amount: amount,
      expected_close_date: formData.expected_close_date || null,
      company_id: formData.company_id || null,
      primary_contact_id: formData.primary_contact_id || null,
      priority: formData.priority,
      lead_source: formData.lead_source || null,
      // HubSpot fields
      probability: probability,
      weighted_amount: weightedAmount,
      monthly_recurring_revenue: formData.monthly_recurring_revenue ? parseFloat(formData.monthly_recurring_revenue) : null,
      total_contract_value: formData.total_contract_value ? parseFloat(formData.total_contract_value) : null,
      closed_won_reason: formData.closed_won_reason || null,
      closed_lost_reason: formData.closed_lost_reason || null,
      dead_deal_reason: formData.dead_deal_reason || null,
      next_step: formData.next_step || null,
      next_activity_date: formData.next_activity_date || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
      lead_type: formData.lead_type || null,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('crm_deals')
      .update(dealData)
      .eq('id', deal.id)
      .select(`
        *,
        company:crm_companies(id, name, logo_url),
        contact:crm_contacts(id, first_name, last_name, email)
      `)
      .single();

    setLoading(false);

    if (error) {
      console.error('Error updating deal:', error);
      return;
    }

    // Log activity
    await supabase.from('crm_activities').insert({
      deal_id: deal.id,
      type: 'note',
      subject: 'Deal updated',
      body: `Deal "${formData.name}" was updated`,
    });

    onUpdated(data);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ 
      ...prev, 
      tags: prev.tags.filter(t => t !== tagToRemove) 
    }));
  };

  const selectedStage = stages.find(s => s.id === formData.stage);
  const showClosedWonReason = selectedStage?.is_won;
  const showClosedLostReason = selectedStage?.is_lost || formData.stage === 'closed-lost';
  const showDeadReason = formData.stage === 'dead' || formData.stage === 'dead-deals';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Deal</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Deal Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Acme Corp - Enterprise Plan"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          {/* Stage & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Closed Won Reason */}
          {showClosedWonReason && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <label className="block text-sm font-medium text-green-800 mb-1">
                🎉 Why did we win this deal?
              </label>
              <textarea
                value={formData.closed_won_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, closed_won_reason: e.target.value }))}
                rows={2}
                placeholder="What made this deal successful?"
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 bg-white"
              />
            </div>
          )}

          {/* Closed Lost Reason */}
          {showClosedLostReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <label className="block text-sm font-medium text-red-800 mb-1">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Why did we lose this deal?
              </label>
              <textarea
                value={formData.closed_lost_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, closed_lost_reason: e.target.value }))}
                rows={2}
                placeholder="What went wrong? (helps improve future deals)"
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
              />
            </div>
          )}

          {/* Dead Deal Reason */}
          {showDeadReason && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why did this deal go dead?
              </label>
              <textarea
                value={formData.dead_deal_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, dead_deal_reason: e.target.value }))}
                rows={2}
                placeholder="Reason for marking dead..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500"
              />
            </div>
          )}

          {/* Amount & Probability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deal Value
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability %
              </label>
              <div className="relative">
                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                  placeholder="50"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Close
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Next Step & Next Activity Date */}
          <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ArrowRight className="w-4 h-4 inline mr-1 text-violet-500" />
                Next Step
              </label>
              <input
                type="text"
                value={formData.next_step}
                onChange={(e) => setFormData(prev => ({ ...prev, next_step: e.target.value }))}
                placeholder="What's the next action?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Activity Date
              </label>
              <input
                type="date"
                value={formData.next_activity_date}
                onChange={(e) => setFormData(prev => ({ ...prev, next_activity_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.company_id}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  company_id: e.target.value,
                  primary_contact_id: ''
                }))}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none"
              >
                <option value="">Select company...</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Contact
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.primary_contact_id}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_id: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none"
              >
                <option value="">Select contact...</option>
                {filteredContacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} {contact.email ? `(${contact.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Tag className="w-4 h-4 inline mr-1 text-gray-400" />
              Tags
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {formData.tags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 text-sm rounded-full"
                >
                  {tag}
                  <button 
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-violet-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 border border-violet-300 hover:bg-violet-50 rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Revenue Details
          </button>

          {/* Advanced Fields */}
          {showAdvanced && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              {/* MRR & TCV */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MRR
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.monthly_recurring_revenue}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthly_recurring_revenue: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Contract Value
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.total_contract_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_contract_value: e.target.value }))}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Type & Source */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Type
                  </label>
                  <select
                    value={formData.lead_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option value="">Select type...</option>
                    <option value="Inbound">Inbound</option>
                    <option value="Outbound">Outbound</option>
                    <option value="Referral">Referral</option>
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Source
                  </label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => setFormData(prev => ({ ...prev, lead_source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option value="">Select source...</option>
                    <option value="inbound">Inbound</option>
                    <option value="outbound-linkedin">Outbound - LinkedIn</option>
                    <option value="outbound-email">Outbound - Email</option>
                    <option value="referral">Referral</option>
                    <option value="website">Website</option>
                    <option value="event">Event</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Add any notes about this deal..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
