'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  Building2,
  MapPin,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NewContactDialog } from '@/components/crm/new-contact-dialog';
import { ContactDetailPanel } from '@/components/crm/contact-detail-panel';

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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [sortField, setSortField] = useState<'name' | 'company' | 'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('crm_contacts')
      .select(`
        *,
        company:crm_companies(id, name, logo_url)
      `)
      .order('created_at', { ascending: false });

    if (data) setContacts(data);
    setLoading(false);
  };

  const filteredContacts = contacts
    .filter(contact => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        contact.first_name.toLowerCase().includes(query) ||
        (contact.last_name?.toLowerCase().includes(query)) ||
        (contact.email?.toLowerCase().includes(query)) ||
        (contact.company?.name.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.first_name.localeCompare(b.first_name);
      } else if (sortField === 'company') {
        comparison = (a.company?.name || '').localeCompare(b.company?.name || '');
      } else {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'name' | 'company' | 'created_at') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getInitials = (contact: Contact) => {
    return `${contact.first_name[0]}${contact.last_name?.[0] || ''}`.toUpperCase();
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-green-100 text-green-700',
    unqualified: 'bg-gray-100 text-gray-600',
    customer: 'bg-violet-100 text-violet-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">{contacts.length} contacts</p>
        </div>
        <button 
          onClick={() => setShowNewContact(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3">
                <button 
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  Name
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-6 py-3">
                <button 
                  onClick={() => toggleSort('company')}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wider hover:text-gray-900"
                >
                  Company
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Phone
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredContacts.map((contact) => (
              <tr 
                key={contact.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedContact(contact)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{getInitials(contact)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </p>
                      {contact.title && (
                        <p className="text-sm text-gray-500">{contact.title}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {contact.company ? (
                    <div className="flex items-center gap-2">
                      {contact.company.logo_url ? (
                        <img src={contact.company.logo_url} alt="" className="w-5 h-5 rounded" />
                      ) : (
                        <Building2 className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-gray-700">{contact.company.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {contact.email ? (
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="text-gray-700 hover:text-violet-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {contact.phone ? (
                    <a 
                      href={`tel:${contact.phone}`} 
                      className="text-gray-700 hover:text-violet-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {contact.lead_status ? (
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[contact.lead_status] || statusColors.new}`}>
                      {contact.lead_status}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No contacts found</p>
            <button 
              onClick={() => setShowNewContact(true)}
              className="mt-2 text-violet-600 hover:text-violet-700 text-sm font-medium"
            >
              Add your first contact
            </button>
          </div>
        )}
      </div>

      {/* New Contact Dialog */}
      {showNewContact && (
        <NewContactDialog
          onClose={() => setShowNewContact(false)}
          onCreated={(newContact) => {
            setContacts(prev => [newContact, ...prev]);
            setShowNewContact(false);
          }}
        />
      )}

      {/* Contact Detail Panel */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdated={(updated) => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            setSelectedContact(updated);
          }}
          onDeleted={() => {
            setContacts(prev => prev.filter(c => c.id !== selectedContact.id));
            setSelectedContact(null);
          }}
        />
      )}
    </div>
  );
}
