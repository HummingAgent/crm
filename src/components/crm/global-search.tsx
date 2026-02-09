'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Kanban, 
  Users, 
  Building2, 
  DollarSign,
  Mail,
  ArrowRight,
  Command,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'deal' | 'contact' | 'company';
  title: string;
  subtitle: string | null;
  meta: string | null;
}

interface GlobalSearchProps {
  onClose: () => void;
  onSelectDeal?: (id: string) => void;
  onSelectContact?: (id: string) => void;
  onSelectCompany?: (id: string) => void;
}

export function GlobalSearch({ onClose, onSelectDeal, onSelectContact, onSelectCompany }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const supabase = createClient();
    const q = `%${searchQuery}%`;

    const [dealsRes, contactsRes, companiesRes] = await Promise.all([
      supabase
        .from('crm_deals')
        .select('id, name, amount, stage, company:crm_companies(name)')
        .or(`name.ilike.${q},description.ilike.${q}`)
        .limit(5),
      supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, company:crm_companies(name)')
        .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`)
        .limit(5),
      supabase
        .from('crm_companies')
        .select('id, name, industry, website')
        .or(`name.ilike.${q},industry.ilike.${q},domain.ilike.${q}`)
        .limit(5),
    ]);

    const allResults: SearchResult[] = [];

    // Deals
    if (dealsRes.data) {
      dealsRes.data.forEach(d => {
        const company = Array.isArray(d.company) ? d.company[0] : d.company;
        allResults.push({
          id: d.id,
          type: 'deal',
          title: d.name,
          subtitle: company?.name || null,
          meta: d.amount ? `$${d.amount.toLocaleString()}` : null,
        });
      });
    }

    // Contacts
    if (contactsRes.data) {
      contactsRes.data.forEach(c => {
        const company = Array.isArray(c.company) ? c.company[0] : c.company;
        allResults.push({
          id: c.id,
          type: 'contact',
          title: `${c.first_name} ${c.last_name || ''}`.trim(),
          subtitle: c.email,
          meta: company?.name || null,
        });
      });
    }

    // Companies
    if (companiesRes.data) {
      companiesRes.data.forEach(co => {
        allResults.push({
          id: co.id,
          type: 'company',
          title: co.name,
          subtitle: co.industry,
          meta: co.website,
        });
      });
    }

    setResults(allResults);
    setSelectedIndex(0);
    setLoading(false);
  };

  const handleSelect = (result: SearchResult) => {
    switch (result.type) {
      case 'deal':
        router.push(`/deals?view=${result.id}`);
        break;
      case 'contact':
        router.push(`/contacts?view=${result.id}`);
        break;
      case 'company':
        router.push(`/companies?view=${result.id}`);
        break;
    }
    onClose();
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'deal': return <Kanban className="w-4 h-4" />;
      case 'contact': return <Users className="w-4 h-4" />;
      case 'company': return <Building2 className="w-4 h-4" />;
      default: return null;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'deal': return 'Deal';
      case 'contact': return 'Contact';
      case 'company': return 'Company';
      default: return type;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'deal': return 'text-violet-500 bg-violet-50';
      case 'contact': return 'text-blue-500 bg-blue-50';
      case 'company': return 'text-emerald-500 bg-emerald-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Input */}
        <div className="flex items-center px-4 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals, contacts, companies..."
            className="w-full px-3 py-4 text-base bg-transparent outline-none placeholder-gray-400"
          />
          {loading && <Loader2 className="w-4 h-4 text-violet-500 animate-spin flex-shrink-0" />}
          {query && !loading && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  index === selectedIndex ? 'bg-violet-50' : 'hover:bg-gray-50'
                )}
              >
                <div className={cn('p-2 rounded-lg', typeColor(result.type))}>
                  {typeIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{result.title}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                      typeColor(result.type)
                    )}>
                      {typeLabel(result.type)}
                    </span>
                  </div>
                  {result.subtitle && (
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  )}
                </div>
                {result.meta && (
                  <span className="text-sm text-gray-400 flex-shrink-0">{result.meta}</span>
                )}
                {index === selectedIndex && (
                  <ArrowRight className="w-4 h-4 text-violet-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && !loading && results.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <p className="text-sm">No results for "{query}"</p>
          </div>
        )}

        {/* Hint */}
        {!query && (
          <div className="py-6 px-4 text-center text-gray-400">
            <p className="text-sm">Search across all deals, contacts, and companies</p>
            <div className="flex items-center justify-center gap-1 mt-2 text-xs">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono ml-2">↵</kbd>
              <span>select</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono ml-2">esc</kbd>
              <span>close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
