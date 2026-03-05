'use client';

import { useState } from 'react';
import { 
  Wand2, 
  Loader2, 
  Check, 
  AlertCircle,
  Image
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyEnrichButtonProps {
  companyId: string;
  companyName: string;
  hasLogo?: boolean;
  onEnriched?: (result: { logo: string | null; success: boolean }) => void;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export function CompanyEnrichButton({
  companyId,
  companyName,
  hasLogo = false,
  onEnriched,
  variant = 'button',
  size = 'md',
}: CompanyEnrichButtonProps) {
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const handleEnrich = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setEnriching(true);
    setResult(null);

    try {
      const res = await fetch('/api/companies/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyIds: [companyId] }),
      });

      const data = await res.json();

      if (data.error) {
        setResult('error');
      } else {
        const enrichResult = data.results?.[0];
        setResult(enrichResult?.success ? 'success' : 'error');
        onEnriched?.({
          logo: enrichResult?.logo || null,
          success: enrichResult?.success || false,
        });
      }
    } catch (err) {
      setResult('error');
    }

    setEnriching(false);
    
    // Clear result after 2 seconds
    setTimeout(() => setResult(null), 2000);
  };

  const sizeClasses = {
    sm: variant === 'icon' ? 'p-1.5' : 'px-3 py-1.5 text-xs',
    md: variant === 'icon' ? 'p-2' : 'px-4 py-2 text-sm',
    lg: variant === 'icon' ? 'p-2.5' : 'px-5 py-2.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleEnrich}
        disabled={enriching}
        className={cn(
          'rounded-lg transition-all',
          sizeClasses[size],
          result === 'success' 
            ? 'text-green-500 bg-green-50'
            : result === 'error'
            ? 'text-red-500 bg-red-50'
            : 'text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]'
        )}
        title={hasLogo ? 'Re-fetch company logo' : 'Fetch company logo'}
      >
        {enriching ? (
          <Loader2 className={cn('animate-spin', iconSizes[size])} />
        ) : result === 'success' ? (
          <Check className={iconSizes[size]} />
        ) : result === 'error' ? (
          <AlertCircle className={iconSizes[size]} />
        ) : (
          <Wand2 className={iconSizes[size]} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleEnrich}
      disabled={enriching}
      className={cn(
        'flex items-center gap-2 font-medium rounded-lg transition-all',
        sizeClasses[size],
        result === 'success' 
          ? 'text-green-600 bg-green-50 border border-green-200'
          : result === 'error'
          ? 'text-red-600 bg-red-50 border border-red-200'
          : 'text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)] hover:text-white border border-[var(--primary-light)] hover:border-[var(--primary)]'
      )}
    >
      {enriching ? (
        <Loader2 className={cn('animate-spin', iconSizes[size])} />
      ) : result === 'success' ? (
        <Check className={iconSizes[size]} />
      ) : result === 'error' ? (
        <AlertCircle className={iconSizes[size]} />
      ) : (
        <Wand2 className={iconSizes[size]} />
      )}
      {enriching ? 'Enriching...' : result === 'success' ? 'Enriched!' : result === 'error' ? 'Failed' : hasLogo ? 'Re-enrich' : 'Enrich Company'}
    </button>
  );
}

// Bulk enrich button for companies list
export function BulkEnrichButton({
  onComplete,
}: {
  onComplete?: (result: { found: number; notFound: number }) => void;
}) {
  const [enriching, setEnriching] = useState(false);
  const [result, setResult] = useState<{ found: number; notFound: number } | null>(null);

  const handleEnrich = async () => {
    setEnriching(true);
    setResult(null);

    try {
      const res = await fetch('/api/companies/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });

      const data = await res.json();

      if (!data.error) {
        const found = data.results?.filter((r: { success: boolean }) => r.success).length || 0;
        const notFound = data.results?.filter((r: { success: boolean }) => !r.success).length || 0;
        setResult({ found, notFound });
        onComplete?.({ found, notFound });
      }
    } catch (err) {
      console.error('Bulk enrich failed:', err);
    }

    setEnriching(false);
    setTimeout(() => setResult(null), 5000);
  };

  return (
    <button
      onClick={handleEnrich}
      disabled={enriching}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-all disabled:opacity-50"
    >
      {enriching ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Image className="w-4 h-4" />
      )}
      {enriching ? 'Enriching all...' : result ? `Found ${result.found} logos` : 'Enrich All Companies'}
    </button>
  );
}
