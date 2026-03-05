'use client';

import { useState } from 'react';
import { 
  Calculator, 
  Loader2, 
  Check, 
  TrendingUp,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScoreBadge } from './score-badge';

interface ScoreDealButtonProps {
  dealId: string;
  currentScore?: number | null;
  onScored?: (score: number, breakdown: ScoreBreakdown) => void;
  variant?: 'button' | 'icon' | 'compact';
  showScore?: boolean;
}

interface ScoreBreakdown {
  rules: { name: string; points: number }[];
  total: number;
  calculated_at: string;
}

export function ScoreDealButton({
  dealId,
  currentScore,
  onScored,
  variant = 'button',
  showScore = true,
}: ScoreDealButtonProps) {
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<number | null>(currentScore ?? null);
  const [justScored, setJustScored] = useState(false);

  const handleScore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setScoring(true);

    try {
      const res = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deal',
          ids: [dealId],
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Fetch the updated score
        const scoreRes = await fetch(`/api/scoring/calculate?type=deal&id=${dealId}`);
        const scoreData = await scoreRes.json();
        
        if (scoreData.lead_score !== undefined) {
          setScore(scoreData.lead_score);
          setJustScored(true);
          onScored?.(scoreData.lead_score, scoreData.score_breakdown);
          
          setTimeout(() => setJustScored(false), 2000);
        }
      }
    } catch (err) {
      console.error('Scoring failed:', err);
    }

    setScoring(false);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleScore}
        disabled={scoring}
        className={cn(
          'p-2 rounded-lg transition-all',
          justScored 
            ? 'text-green-500 bg-green-50'
            : 'text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]'
        )}
        title="Calculate lead score"
      >
        {scoring ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : justScored ? (
          <Check className="w-4 h-4" />
        ) : (
          <Calculator className="w-4 h-4" />
        )}
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {showScore && score !== null && score > 0 && (
          <ScoreBadge score={score} size="sm" />
        )}
        <button
          onClick={handleScore}
          disabled={scoring}
          className={cn(
            'p-1.5 rounded-md transition-all',
            justScored 
              ? 'text-green-500 bg-green-50'
              : 'text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]'
          )}
          title={score ? 'Recalculate score' : 'Calculate score'}
        >
          {scoring ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : justScored ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {showScore && score !== null && score > 0 && (
        <ScoreBadge score={score} size="md" />
      )}
      <button
        onClick={handleScore}
        disabled={scoring}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
          justScored 
            ? 'text-green-600 bg-green-50 border border-green-200'
            : 'text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)] hover:text-white border border-transparent'
        )}
      >
        {scoring ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : justScored ? (
          <Check className="w-4 h-4" />
        ) : (
          <Calculator className="w-4 h-4" />
        )}
        {scoring ? 'Scoring...' : justScored ? 'Scored!' : score ? 'Rescore' : 'Score Lead'}
      </button>
    </div>
  );
}

// Score all contacts button
export function ScoreAllButton({
  type,
  onComplete,
}: {
  type: 'contact' | 'deal' | 'all';
  onComplete?: (result: { contacts: number; deals: number }) => void;
}) {
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<{ contacts: number; deals: number } | null>(null);

  const handleScore = async () => {
    setScoring(true);
    setResult(null);

    try {
      const res = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.scored);
        onComplete?.(data.scored);
      }
    } catch (err) {
      console.error('Bulk scoring failed:', err);
    }

    setScoring(false);
    setTimeout(() => setResult(null), 5000);
  };

  const typeLabel = type === 'all' ? 'All Leads' : type === 'contact' ? 'All Contacts' : 'All Deals';

  return (
    <button
      onClick={handleScore}
      disabled={scoring}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-all disabled:opacity-50"
    >
      {scoring ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <TrendingUp className="w-4 h-4" />
      )}
      {scoring 
        ? `Scoring ${typeLabel}...` 
        : result 
        ? `Scored ${result.contacts + result.deals} leads` 
        : `Score ${typeLabel}`
      }
    </button>
  );
}

// Score breakdown display
export function ScoreBreakdownDisplay({ 
  breakdown,
  compact = false,
}: { 
  breakdown: ScoreBreakdown;
  compact?: boolean;
}) {
  if (!breakdown?.rules?.length) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {breakdown.rules.map((rule, i) => (
          <span 
            key={i}
            className={cn(
              'px-1.5 py-0.5 text-xs rounded',
              rule.points > 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            )}
          >
            {rule.points > 0 ? '+' : ''}{rule.points}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--foreground)]">Score Breakdown</span>
        <span className="font-bold text-[var(--primary)]">{breakdown.total} points</span>
      </div>
      <div className="space-y-1">
        {breakdown.rules.map((rule, i) => (
          <div 
            key={i}
            className="flex items-center justify-between text-sm py-1 border-b border-[var(--border)] last:border-0"
          >
            <span className="text-[var(--muted)]">{rule.name}</span>
            <span className={cn(
              'font-medium',
              rule.points > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {rule.points > 0 ? '+' : ''}{rule.points}
            </span>
          </div>
        ))}
      </div>
      {breakdown.calculated_at && (
        <p className="text-xs text-[var(--muted)]">
          Calculated {new Date(breakdown.calculated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
