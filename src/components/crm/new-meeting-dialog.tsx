'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, DollarSign, Building2, User, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Deal {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
}

interface NewMeetingDialogProps {
  defaultDate?: Date | null;
  defaultDealId?: string;
  defaultContactId?: string;
  onClose: () => void;
  onCreated: (meeting: any) => void;
}

export function NewMeetingDialog({ 
  defaultDate, 
  defaultDealId, 
  defaultContactId,
  onClose, 
  onCreated 
}: NewMeetingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    subject: '',
    date: defaultDate ? formatDateForInput(defaultDate) : formatDateForInput(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    deal_id: defaultDealId || '',
    contact_id: defaultContactId || '',
    company_id: '',
    notes: '',
    meetingType: 'video', // video, phone, in-person
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    const [dealsRes, contactsRes, companiesRes] = await Promise.all([
      supabase.from('crm_deals').select('id, name').order('created_at', { ascending: false }),
      supabase.from('crm_contacts').select('id, first_name, last_name, company_id').order('first_name'),
      supabase.from('crm_companies').select('id, name').order('name'),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);
    if (companiesRes.data) setCompanies(companiesRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    
    // Combine date and time
    const meetingStart = new Date(`${formData.date}T${formData.startTime}`);
    const meetingEnd = new Date(`${formData.date}T${formData.endTime}`);

    // Determine location based on meeting type
    let location = formData.location;
    if (!location) {
      if (formData.meetingType === 'video') location = 'Video call';
      else if (formData.meetingType === 'phone') location = 'Phone call';
      else location = 'In-person';
    }

    const meetingData = {
      type: 'meeting',
      subject: formData.subject || 'Meeting',
      body: formData.notes || null,
      meeting_start: meetingStart.toISOString(),
      meeting_end: meetingEnd.toISOString(),
      meeting_location: location,
      deal_id: formData.deal_id || null,
      contact_id: formData.contact_id || null,
      company_id: formData.company_id || null,
    };

    const { data, error } = await supabase
      .from('crm_activities')
      .insert(meetingData)
      .select(`
        *,
        deal:crm_deals(id, name, amount),
        contact:crm_contacts(id, first_name, last_name),
        company:crm_companies(id, name)
      `)
      .single();

    setLoading(false);

    if (error) {
      console.error('Error creating meeting:', error);
      return;
    }

    onCreated(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Log Meeting</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Discovery call with Acme"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          {/* Meeting Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Type</label>
            <div className="flex gap-2">
              {[
                { id: 'video', label: '📹 Video Call' },
                { id: 'phone', label: '📞 Phone' },
                { id: 'in-person', label: '🤝 In-Person' },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, meetingType: type.id }))}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    formData.meetingType === type.id
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location / Link</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="https://zoom.us/j/... or office address"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Deal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Related Deal</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.deal_id}
                onChange={(e) => setFormData(prev => ({ ...prev, deal_id: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none"
              >
                <option value="">Select deal (optional)</option>
                {deals.map(deal => (
                  <option key={deal.id} value={deal.id}>{deal.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={formData.contact_id}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_id: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none"
              >
                <option value="">Select contact (optional)</option>
                {contacts.map(contact => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Meeting agenda, discussion points..."
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
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Log Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
