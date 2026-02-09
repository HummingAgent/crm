'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Linkedin, 
  Calendar,
  Edit2,
  Trash2,
  ExternalLink,
  DollarSign,
  MessageSquare,
  Clock
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  company_id: string | null;
  linkedin_url: string | null;
  location: string | null;
  notes: string | null;
  lead_status: string | null;
  created_at: string;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

interface Deal {
  id: string;
  name: string;
  amount: number | null;
  stage: string;
}

interface Activity {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  created_at: string;
}

interface ContactDetailPanelProps {
  contact: Contact;
  onClose: () => void;
  onUpdated: (contact: Contact) => void;
  onDeleted: () => void;
  onEdit?: (contact: Contact) => void;
}

export function ContactDetailPanel({ contact, onClose, onUpdated, onDeleted, onEdit }: ContactDetailPanelProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRelatedData();
  }, [contact.id]);

  const loadRelatedData = async () => {
    const supabase = createClient();

    // Load deals associated with this contact
    const { data: dealContacts } = await supabase
      .from('crm_deal_contacts')
      .select('deal:crm_deals(id, name, amount, stage)')
      .eq('contact_id', contact.id);

    // Load activities for this contact
    const { data: activityData } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (dealContacts) {
      setDeals(dealContacts.map((dc: any) => dc.deal).filter(Boolean));
    }
    if (activityData) setActivities(activityData);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    setDeleting(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('crm_contacts')
      .delete()
      .eq('id', contact.id);

    if (error) {
      console.error('Error deleting contact:', error);
      setDeleting(false);
      return;
    }

    onDeleted();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = () => {
    return `${contact.first_name[0]}${contact.last_name?.[0] || ''}`.toUpperCase();
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-green-100 text-green-700',
    unqualified: 'bg-gray-100 text-gray-600',
    customer: 'bg-violet-100 text-violet-700',
  };

  const activityIcons: Record<string, any> = {
    email: Mail,
    call: Phone,
    meeting: Calendar,
    note: MessageSquare,
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Contact Details</h2>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button 
              onClick={() => onEdit(contact)}
              className="p-2 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-violet-50"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Profile */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <span className="text-xl font-semibold text-white">{getInitials()}</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {contact.first_name} {contact.last_name}
            </h3>
            {contact.title && (
              <p className="text-gray-600">{contact.title}</p>
            )}
            {contact.lead_status && (
              <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[contact.lead_status] || statusColors.new}`}>
                {contact.lead_status}
              </span>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-3 mb-6">
          {contact.email && (
            <a 
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 text-gray-700 hover:text-violet-600"
            >
              <Mail className="w-4 h-4 text-gray-400" />
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <a 
              href={`tel:${contact.phone}`}
              className="flex items-center gap-3 text-gray-700 hover:text-violet-600"
            >
              <Phone className="w-4 h-4 text-gray-400" />
              {contact.phone}
            </a>
          )}
          {contact.company && (
            <div className="flex items-center gap-3 text-gray-700">
              <Building2 className="w-4 h-4 text-gray-400" />
              {contact.company.name}
            </div>
          )}
          {contact.location && (
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400" />
              {contact.location}
            </div>
          )}
          {contact.linkedin_url && (
            <a 
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-violet-600"
            >
              <Linkedin className="w-4 h-4 text-gray-400" />
              LinkedIn
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Notes */}
        {contact.notes && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Notes</h4>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        {/* Deals */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Deals ({deals.length})</h4>
          {deals.length > 0 ? (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{deal.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{deal.stage.replace(/-/g, ' ')}</p>
                  </div>
                  {deal.amount && (
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(deal.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No deals yet</p>
          )}
        </div>

        {/* Activity Timeline */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h4>
          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type] || Clock;
                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.subject || activity.type}</p>
                      {activity.body && (
                        <p className="text-xs text-gray-500 truncate">{activity.body}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(activity.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No activity yet</p>
          )}
        </div>

        {/* Created date */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Created {formatDate(contact.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
