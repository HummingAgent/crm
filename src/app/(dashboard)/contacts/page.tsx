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
  ArrowUpDown,
  Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NewContactDialog } from '@/components/crm/new-contact-dialog';
import { ContactDetailPanel } from '@/components/crm/contact-detail-panel';
import { EditContactDialog } from '@/components/crm/edit-contact-dialog';

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
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
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
      {/* Premium Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gradient-violet">Contacts</h1>
          <p className="text-lg text-gray-600 mt-2 font-medium">{contacts.length} people in your network</p>
        </div>
        <button 
          onClick={() => setShowNewContact(true)}
          className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-2xl shadow-lg shadow-violet-500/25 spring-transition hover:scale-105 touch-feedback pulse-glow"
        >
          <Plus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      {/* Premium Search & Filters */}
      <div className="glass-card rounded-2xl p-4 lg:p-6 border border-white/30 mb-8">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-sm bg-white/60 border border-white/30 rounded-2xl focus-ring-violet backdrop-blur-sm hover:bg-white/80 spring-transition"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white/60 border border-white/30 rounded-2xl hover:bg-white/80 spring-transition touch-feedback">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button 
              onClick={() => toggleSort('name')}
              className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white/60 border border-white/30 rounded-2xl hover:bg-white/80 spring-transition touch-feedback"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-First Contact Cards */}
      <div className="space-y-4 lg:space-y-6">
        {filteredContacts.length > 0 ? (
          <>
            {/* Desktop Table Header (hidden on mobile) */}
            <div className="hidden lg:block glass-card rounded-2xl p-4 border border-white/30">
              <div className="grid grid-cols-6 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-1 hover:text-gray-700 spring-transition"
                >
                  Contact <ArrowUpDown className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => toggleSort('company')}
                  className="flex items-center gap-1 hover:text-gray-700 spring-transition"
                >
                  Company <ArrowUpDown className="w-3 h-3" />
                </button>
                <span>Email</span>
                <span>Phone</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
            </div>

            {/* Contact Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              {filteredContacts.map((contact, index) => {
                // Generate gradient background based on initials
                const gradientColors = [
                  'from-violet-500 to-purple-600',
                  'from-blue-500 to-cyan-600',
                  'from-emerald-500 to-teal-600', 
                  'from-orange-500 to-red-500',
                  'from-pink-500 to-rose-600',
                  'from-indigo-500 to-blue-600'
                ];
                const avatarGradient = gradientColors[index % gradientColors.length];
                
                return (
                  <div 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="glass-card rounded-2xl p-4 lg:p-6 border border-white/30 cursor-pointer group touch-feedback hover:scale-[1.01] spring-transition"
                  >
                    {/* Mobile Card Layout */}
                    <div className="lg:hidden">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-105 spring-transition`}>
                          <span className="text-lg font-bold text-white">{getInitials(contact)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg line-clamp-1">
                            {contact.first_name} {contact.last_name}
                          </h3>
                          {contact.title && (
                            <p className="text-sm text-gray-600 line-clamp-1">{contact.title}</p>
                          )}
                          {contact.company && (
                            <div className="flex items-center gap-2 mt-1">
                              {contact.company.logo_url ? (
                                <img src={contact.company.logo_url} alt="" className="w-4 h-4 rounded" />
                              ) : (
                                <Building2 className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="text-sm text-gray-600 font-medium line-clamp-1">{contact.company.name}</span>
                            </div>
                          )}
                        </div>
                        {contact.lead_status && (
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[contact.lead_status] || statusColors.new}`}>
                            {contact.lead_status}
                          </span>
                        )}
                      </div>
                      
                      {/* Contact Actions */}
                      <div className="flex items-center gap-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl spring-transition touch-feedback"
                          >
                            <Mail className="w-4 h-4" />
                            Email
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl spring-transition touch-feedback"
                          >
                            <Phone className="w-4 h-4" />
                            Call
                          </a>
                        )}
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl spring-transition touch-feedback"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Desktop Table Row Layout */}
                    <div className="hidden lg:grid lg:grid-cols-6 lg:gap-4 lg:items-center">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-lg group-hover:scale-105 spring-transition`}>
                          <span className="text-sm font-bold text-white">{getInitials(contact)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 line-clamp-1">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.title && (
                            <p className="text-sm text-gray-500 line-clamp-1">{contact.title}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        {contact.company ? (
                          <div className="flex items-center gap-2">
                            {contact.company.logo_url ? (
                              <img src={contact.company.logo_url} alt="" className="w-5 h-5 rounded" />
                            ) : (
                              <Building2 className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-gray-700 font-medium line-clamp-1">{contact.company.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                      
                      <div>
                        {contact.email ? (
                          <a 
                            href={`mailto:${contact.email}`} 
                            className="text-gray-700 hover:text-violet-600 font-medium spring-transition line-clamp-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                      
                      <div>
                        {contact.phone ? (
                          <a 
                            href={`tel:${contact.phone}`} 
                            className="text-gray-700 hover:text-violet-600 font-medium spring-transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                      
                      <div>
                        {contact.lead_status ? (
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusColors[contact.lead_status] || statusColors.new}`}>
                            {contact.lead_status}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-end gap-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg spring-transition"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg spring-transition"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg spring-transition"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="glass-card rounded-2xl p-12 lg:p-16 border border-white/30 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try adjusting your search terms' : "Start building your network by adding your first contact"}
            </p>
            <button 
              onClick={() => setShowNewContact(true)}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-2xl shadow-lg shadow-violet-500/25 spring-transition hover:scale-105"
            >
              <Plus className="w-4 h-4" />
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
          onEdit={(contact) => setEditingContact(contact)}
        />
      )}

      {/* Edit Contact Dialog */}
      {editingContact && (
        <EditContactDialog
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onUpdated={(updated) => {
            setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
            if (selectedContact?.id === updated.id) {
              setSelectedContact(updated);
            }
            setEditingContact(null);
          }}
        />
      )}
    </div>
  );
}
