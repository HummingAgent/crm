'use client';

import { useState, useEffect } from 'react';
import { X, Building2, User, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PipelineStage {
  id: string;
  name: string;
  color: string;
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
  description: string | null;
  stage: string;
  amount: number | null;
  expected_close_date: string | null;
  company_id: string | null;
  primary_contact_id: string | null;
  priority: string;
  lead_source: string | null;
  deal_type: string | null;
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

  const [formData, setFormData] = useState({
    name: deal.name || '',
    description: deal.description || '',
    stage: deal.stage || 'new-lead',
    amount: deal.amount?.toString() || '',
    expected_close_date: deal.expected_close_date?.split('T')[0] || '',
    company_id: deal.company_id || '',
    primary_contact_id: deal.primary_contact_id || '',
    priority: deal.priority || 'medium',
    lead_source: deal.lead_source || '',
    deal_type: deal.deal_type || '',
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

  const loadCompaniesAndContacts = async () => {
    const supabase = createClient();
    
    const [companiesRes, contactsRes] = await Promise.all([
      supabase.from('crm_companies').select('id, name').order('name'),
      supabase.from('crm_contacts').select('id, first_name, last_name, email, company_id').order('first_name'),
    ]);

    if (companiesRes.data) setCompanies(companiesRes.data);
    if (contactsRes.data) {
      setContacts(contactsRes.data);
      // Set filtered contacts, include current contact even if company doesn't match
      if (formData.company_id) {
        const filtered = contactsRes.data.filter(c => 
          c.company_id === formData.company_id || c.id === deal.primary_contact_id
        );
        setFilteredContacts(filtered);
      } else {
        setFilteredContacts(contactsRes.data);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    
    const dealData = {
      name: formData.name,
      description: formData.description || null,
      stage: formData.stage,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      expected_close_date: formData.expected_close_date || null,
      company_id: formData.company_id || null,
      primary_contact_id: formData.primary_contact_id || null,
      priority: formData.priority,
      lead_source: formData.lead_source || null,
      deal_type: formData.deal_type || null,
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

    // Log activity for stage change
    if (deal.stage !== formData.stage) {
      await supabase.from('crm_activities').insert({
        deal_id: deal.id,
        type: 'stage-change',
        stage_from: deal.stage,
        stage_to: formData.stage,
        subject: `Deal moved from ${deal.stage} to ${formData.stage}`,
      });
    }

    // Log activity for update
    await supabase.from('crm_activities').insert({
      deal_id: deal.id,
      type: 'note',
      subject: 'Deal updated',
      body: `Deal "${formData.name}" was updated`,
    });

    onUpdated(data);
  };

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

          {/* Amount & Close Date */}
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
          </div>

          {/* Deal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Type
            </label>
            <select
              value={formData.deal_type}
              onChange={(e) => setFormData(prev => ({ ...prev, deal_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="">Select type...</option>
              <option value="New Business">New Business</option>
              <option value="Existing Business">Existing Business</option>
              <option value="Renewal">Renewal</option>
              <option value="Upsell">Upsell</option>
            </select>
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

          {/* Lead Source */}
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
              <option value="External">External</option>
              <option value="Internal">Internal</option>
              <option value="Inbound Website">Inbound Website</option>
              <option value="Linkedin">LinkedIn</option>
            </select>
          </div>

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
