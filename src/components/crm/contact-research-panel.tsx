'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Loader2, 
  Target,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  RefreshCw,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchData {
  summary: string;
  linkedin_insights: string | null;
  company_insights: string | null;
  pain_points: string[];
  talking_points: string[];
  recommended_approach: string;
  researched_at: string;
}

interface ContactResearchPanelProps {
  contactId: string;
  contactName: string;
  jobTitle?: string | null;
  companyName?: string | null;
  existingResearch?: ResearchData | null;
  lastResearchedAt?: string | null;
  onResearchComplete?: (research: ResearchData) => void;
}

export function ContactResearchPanel({
  contactId,
  contactName,
  jobTitle,
  companyName,
  existingResearch,
  lastResearchedAt,
  onResearchComplete,
}: ContactResearchPanelProps) {
  const [research, setResearch] = useState<ResearchData | null>(existingResearch || null);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!!existingResearch);

  useEffect(() => {
    if (existingResearch) {
      setResearch(existingResearch);
    }
  }, [existingResearch]);

  const handleResearch = async () => {
    setResearching(true);
    setError(null);

    try {
      const res = await fetch('/api/research/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [contactId] }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.results?.[0]?.success) {
        // Fetch the updated research
        const researchRes = await fetch(`/api/research/contact?id=${contactId}`);
        const researchData = await researchRes.json();
        
        if (researchData.research_data) {
          setResearch(researchData.research_data);
          setExpanded(true);
          onResearchComplete?.(researchData.research_data);
        }
      } else {
        setError(data.results?.[0]?.error || 'Research failed');
      }
    } catch (err) {
      setError('Failed to research contact');
    }

    setResearching(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isStale = lastResearchedAt && 
    Date.now() - new Date(lastResearchedAt).getTime() > 7 * 24 * 60 * 60 * 1000;

  if (!research && !expanded) {
    return (
      <div className="border border-dashed border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">AI Research</p>
              <p className="text-sm text-[var(--muted)]">Get insights about {contactName}</p>
            </div>
          </div>
          <button
            onClick={handleResearch}
            disabled={researching}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-lg disabled:opacity-50 transition-all"
          >
            {researching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {researching ? 'Researching...' : 'Research Contact'}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">AI Research</p>
            {research?.researched_at && (
              <p className="text-xs text-[var(--muted)] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(research.researched_at)}
                {isStale && <span className="text-[var(--warning)]">(may be outdated)</span>}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleResearch();
          }}
          disabled={researching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
        >
          {researching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Content */}
      {expanded && research && (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
              <User className="w-4 h-4 text-purple-500" />
              Summary
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">{research.summary}</p>
          </div>

          {/* Company Insights */}
          {research.company_insights && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                Company Insights
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{research.company_insights}</p>
            </div>
          )}

          {/* Pain Points */}
          {research.pain_points?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
                <Target className="w-4 h-4 text-red-500" />
                Likely Pain Points
              </div>
              <ul className="space-y-1.5">
                {research.pain_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Talking Points */}
          {research.talking_points?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-2">
                <MessageSquare className="w-4 h-4 text-green-500" />
                Talking Points
              </div>
              <ul className="space-y-1.5">
                {research.talking_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Approach */}
          {research.recommended_approach && (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)] mb-1">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Recommended Approach
              </div>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{research.recommended_approach}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </div>
      )}
    </div>
  );
}

// Compact research button for cards/lists
export function ResearchButton({
  contactId,
  size = 'md',
  onComplete,
}: {
  contactId: string;
  size?: 'sm' | 'md';
  onComplete?: () => void;
}) {
  const [researching, setResearching] = useState(false);

  const handleResearch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setResearching(true);

    try {
      await fetch('/api/research/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [contactId] }),
      });
      onComplete?.();
    } catch (err) {
      console.error('Research failed:', err);
    }

    setResearching(false);
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
  };

  return (
    <button
      onClick={handleResearch}
      disabled={researching}
      className={cn(
        'text-purple-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors',
        sizeClasses[size]
      )}
      title="AI Research"
    >
      {researching ? (
        <Loader2 className={cn('animate-spin', size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')} />
      ) : (
        <Sparkles className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      )}
    </button>
  );
}
