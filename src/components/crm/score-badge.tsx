'use client';

import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({
  score,
  size = 'md',
  showLabel = false,
  className
}: ScoreBadgeProps) {
  // Color coding: 0-30 red, 31-60 yellow, 61-100 green
  const getColorClass = () => {
    if (score >= 61) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 31) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getLabel = () => {
    if (score >= 61) return '🔥 Hot';
    if (score >= 31) return '☀️ Warm';
    return '❄️ Cold';
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        getColorClass(),
        sizeClasses[size],
        className
      )}
      title={`Lead Score: ${score}/100`}
    >
      <span className="font-bold">{score}</span>
      {showLabel && <span className="text-xs opacity-80">{getLabel()}</span>}
    </div>
  );
}
