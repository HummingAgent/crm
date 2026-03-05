'use client';

import { useState } from 'react';
import { 
  X, 
  Search, 
  Loader2, 
  Download, 
  Check, 
  AlertCircle,
  Building2,
  User,
  Mail,
  Briefcase,
  ChevronRight,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApolloContact {
  first_name: string;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  phone: string | null;
  location: string | null;
  company_data: {
    name: string;
    website: string | null;
    industry: string | null;
    employee_count: number | null;
    logo_url: string | null;
  } | null;
}

interface ApolloImportDialogProps {
  onClose: () => void;
  onImported?: () => void;
  pipelineId?: string;
}

export function ApolloImportDialog({ onClose, onImported, pipelineId }: ApolloImportDialogProps) {
  const [step, setStep] = useState<'search' | 'preview' | 'importing' | 'done'>('search');
  const [searchParams, setSearchParams] = useState({
    company: '',
    titles: '',
  });
  const [searching, setSearching] = useState(false);
  const [contacts, setContacts] = useState<ApolloContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  const [createDeals, setCreateDeals] = useState(false);
  const [importResult, setImportResult] = useState<{
    contacts: number;
    companies: number;
    deals: number;
    errors?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchParams.company && !searchParams.titles) {
      setError('Please enter a company name or job titles');
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchParams.company) params.set('company', searchParams.company);
      if (searchParams.titles) params.set('titles', searchParams.titles);

      const res = await fetch(`/api/apollo/import?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setContacts(data.contacts || []);
        setSelectedContacts(new Set(data.contacts?.map((_: unknown, i: number) => i) || []));
        setStep('preview');
      }
    } catch (err) {
      setError('Failed to search Apollo');
    }

    setSearching(false);
  };

  const handleImport = async () => {
    const selectedContactsData = contacts.filter((_, i) => selectedContacts.has(i));
    
    if (selectedContactsData.length === 0) {
      setError('Please select at least one contact');
      return;
    }

    setStep('importing');
    setError(null);

    try {
      const res = await fetch('/api/apollo/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search',
          searchParams: {
            q_organization_name: searchParams.company,
            person_titles: searchParams.titles.split(',').map(t => t.trim()).filter(Boolean),
          },
          createDeals,
          pipelineId,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStep('preview');
      } else {
        setImportResult(data.imported);
        setStep('done');
        onImported?.();
      }
    } catch (err) {
      setError('Import failed');
      setStep('preview');
    }
  };

  const toggleContact = (index: number) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedContacts(newSelected);
  };

  const toggleAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map((_, i) => i)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--card)] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Import from Apollo</h2>
              <p className="text-sm text-[var(--muted)]">Search and import contacts from Apollo.io</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search Step */}
          {step === 'search' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={searchParams.company}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g., Google, Microsoft, Acme Corp"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Job Titles (comma separated)
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={searchParams.titles}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, titles: e.target.value }))}
                    placeholder="e.g., CEO, VP Sales, Director of Marketing"
                    className="w-full pl-11 pr-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-light)] text-[var(--danger)] rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAll}
                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                  >
                    {selectedContacts.size === contacts.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-[var(--muted)]">
                    {selectedContacts.size} of {contacts.length} selected
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createDeals}
                    onChange={(e) => setCreateDeals(e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Create deals for each contact</span>
                </label>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted)]">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No contacts found. Try different search criteria.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      onClick={() => toggleContact(index)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all',
                        selectedContacts.has(index)
                          ? 'bg-[var(--primary-light)] border-2 border-[var(--primary)]'
                          : 'bg-[var(--card-hover)] border-2 border-transparent hover:border-[var(--border)]'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                        selectedContacts.has(index)
                          ? 'bg-[var(--primary)] border-[var(--primary)]'
                          : 'border-[var(--border)]'
                      )}>
                        {selectedContacts.has(index) && <Check className="w-3 h-3 text-white" />}
                      </div>

                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-white">
                          {contact.first_name[0]}{contact.last_name?.[0] || ''}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--foreground)]">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                          {contact.job_title && <span>{contact.job_title}</span>}
                          {contact.company_data?.name && (
                            <>
                              <span>•</span>
                              <span>{contact.company_data.name}</span>
                            </>
                          )}
                        </div>
                        {contact.email && (
                          <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-[var(--danger-light)] text-[var(--danger)] rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-[var(--primary)] animate-spin" />
              <p className="text-lg font-medium text-[var(--foreground)]">Importing contacts...</p>
              <p className="text-sm text-[var(--muted)] mt-1">This may take a moment</p>
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && importResult && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[var(--success-light)] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[var(--success)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Import Complete!</h3>
              <div className="space-y-1 text-[var(--muted)]">
                <p>{importResult.contacts} contacts imported</p>
                <p>{importResult.companies} companies created</p>
                {importResult.deals > 0 && <p>{importResult.deals} deals created</p>}
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4 p-3 bg-[var(--warning-light)] rounded-lg text-left">
                  <p className="text-sm font-medium text-[var(--warning)] mb-1">Some errors occurred:</p>
                  <ul className="text-xs text-[var(--warning)] space-y-0.5">
                    {importResult.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 3 && (
                      <li>...and {importResult.errors.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border)] bg-[var(--card-hover)]">
          {step === 'search' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search Apollo
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('search')}
                className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Back to Search
              </button>
              <button
                onClick={handleImport}
                disabled={selectedContacts.size === 0}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Import {selectedContacts.size} Contacts
              </button>
            </>
          )}

          {step === 'done' && (
            <button
              onClick={onClose}
              className="ml-auto px-6 py-2.5 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
