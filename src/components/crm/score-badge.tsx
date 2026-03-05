'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  previousScore?: number;
  className?: string;
}

export function ScoreBadge({ 
  score, 
  size = 'md', 
  showTrend = false, 
  previousScore,
  className 
}: ScoreBadgeProps) {
  // Determine score tier
  const getTier = (s: number) => {
    if (s >= 80) return { label: 'Hot', color: 'bg-red-100 text-red-700 border-red-200' };
    if (s >= 60) return { label: 'Warm', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    if (s >= 40) return { label: 'Engaged', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    if (s >= 20) return { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: 'Cold', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const tier = getTier(score);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const trend = previousScore !== undefined ? score - previousScore : 0;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <span className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-md border',
        tier.color,
        sizeClasses[size]
      )}>
        <span>{score}</span>
        {size !== 'sm' && <span className="opacity-70">• {tier.label}</span>}
      </span>
      
      {showTrend && previousScore !== undefined && trend !== 0 && (
        <span className={cn(
          'inline-flex items-center text-xs',
          trend > 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}
        </span>
      )}
    </div>
  );
}

// Compact score indicator for cards
export function ScoreIndicator({ score, className }: { score: number; className?: string }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-red-500';
    if (s >= 60) return 'bg-orange-500';
    if (s >= 40) return 'bg-yellow-500';
    if (s >= 20) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className={cn('w-2 h-2 rounded-full', getColor(score))} />
      <span className="text-xs font-medium text-[var(--muted)]">{score}</span>
    </div>
  );
}
