'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Globe,
  MapPin,
  Users,
  Building2,
  Linkedin,
  ExternalLink,
  Trash2,
  Edit2,
  DollarSign,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  title: string | null;
}

interface Deal {
  id: string;
  name: string;
  amount: number | null;
  stage: string;
}

interface CompanyDetailPanelProps {
  company: Company;
  onClose: () => void;
  onUpdated: (company: Company) => void;
  onDeleted: () => void;
  onEdit?: (company: Company) => void;
}

export function CompanyDetailPanel({ company, onClose, onUpdated, onDeleted, onEdit }: CompanyDetailPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRelatedData();
  }, [company.id]);

  const loadRelatedData = async () => {
    const supabase = createClient();

    const [contactsRes, dealsRes] = await Promise.all([
      supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, title')
        .eq('company_id', company.id)
        .order('first_name'),
      supabase
        .from('crm_deals')
        .select('id, name, amount, stage')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
    ]);

    if (contactsRes.data) setContacts(contactsRes.data);
    if (dealsRes.data) setDeals(dealsRes.data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this company? This will not delete associated contacts or deals.')) return;
    
    setDeleting(true);
    const supabase = createClient();
    
    const { error } = await supabase
      .from('crm_companies')
      .delete()
      .eq('id', company.id);

    if (error) {
      console.error('Error deleting company:', error);
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

  const totalDealValue = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Company Details</h2>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button 
              onClick={() => onEdit(company)}
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
        {/* Company Header */}
        <div className="flex items-center gap-4 mb-6">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
            {company.domain && (
              <p className="text-gray-500">{company.domain}</p>
            )}
            {company.industry && (
              <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                {company.industry}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
            <p className="text-xs text-gray-500">Contacts</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{deals.length}</p>
            <p className="text-xs text-gray-500">Deals</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{totalDealValue > 0 ? formatCurrency(totalDealValue) : '$0'}</p>
            <p className="text-xs text-gray-500">Pipeline</p>
          </div>
        </div>

        {/* Company Info */}
        <div className="space-y-3 mb-6">
          {company.website && (
            <a 
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-gray-700 hover:text-violet-600"
            >
              <Globe className="w-4 h-4 text-gray-400" />
              {company.website.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {company.location && (
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-4 h-4 text-gray-400" />
              {company.location}
            </div>
          )}
          {company.size && (
            <div className="flex items-center gap-3 text-gray-700">
              <Users className="w-4 h-4 text-gray-400" />
              {company.size} employees
            </div>
          )}
          {company.linkedin_url && (
            <a 
              href={company.linkedin_url}
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

        {/* Description */}
        {company.description && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">About</h4>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{company.description}</p>
          </div>
        )}

        {/* Contacts */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Contacts ({contacts.length})</h4>
          {contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-violet-600">
                      {contact.first_name[0]}{contact.last_name?.[0] || ''}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {contact.first_name} {contact.last_name}
                    </p>
                    {contact.title && (
                      <p className="text-xs text-gray-500">{contact.title}</p>
                    )}
                  </div>
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-gray-400 hover:text-violet-600">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No contacts yet</p>
          )}
        </div>

        {/* Deals */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Deals ({deals.length})</h4>
          {deals.length > 0 ? (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{deal.name}</p>
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

        {/* Created date */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Added {formatDate(company.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
