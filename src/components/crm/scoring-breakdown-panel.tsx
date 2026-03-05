'use client';

import { useState } from 'react';
import { X, TrendingUp, Target, Zap, RefreshCw } from 'lucide-react';
import { ScoreBadge } from './score-badge';

interface ScoreDetail {
  rule: string;
  category: string;
  points: number;
  reason: string;
}

interface ScoreBreakdown {
  engagement: number;
  fit: number;
  behavior: number;
  total: number;
  details: ScoreDetail[];
}

interface ScoringBreakdownPanelProps {
  type: 'contact' | 'deal';
  id: string;
  currentScore?: number;
  breakdown?: ScoreBreakdown;
  onClose: () => void;
}

export function ScoringBreakdownPanel({
  type,
  id,
  currentScore = 0,
  breakdown: initialBreakdown,
  onClose,
}: ScoringBreakdownPanelProps) {
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(
    initialBreakdown || null
  );
  const [isRecalculating, setIsRecalculating] = useState(false);

  const recalculateScore = async () => {
    setIsRecalculating(true);
    try {
      const response = await fetch('/api/scoring/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });

      if (!response.ok) {
        throw new Error('Failed to recalculate score');
      }

      const data = await response.json();
      setBreakdown(data.breakdown);
    } catch (error) {
      console.error('Failed to recalculate score:', error);
      alert('Failed to recalculate score');
    } finally {
      setIsRecalculating(false);
    }
  };

  const displayBreakdown = breakdown || {
    engagement: 0,
    fit: 0,
    behavior: 0,
    total: currentScore,
    details: [],
  };

  const categoryIcons = {
    engagement: TrendingUp,
    fit: Target,
    behavior: Zap,
  };

  const categoryColors = {
    engagement: 'text-blue-400',
    fit: 'text-purple-400',
    behavior: 'text-green-400',
  };

  const maxScores = {
    engagement: 40,
    fit: 40,
    behavior: 20,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white">Lead Score Breakdown</h2>
            <ScoreBadge score={displayBreakdown.total} size="lg" showLabel />
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Recalculate Button */}
          <button
            onClick={recalculateScore}
            disabled={isRecalculating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculating...' : 'Recalculate Score'}
          </button>

          {/* Category Scores */}
          <div className="space-y-4">
            {(['engagement', 'fit', 'behavior'] as const).map((category) => {
              const Icon = categoryIcons[category];
              const score = displayBreakdown[category];
              const maxScore = maxScores[category];
              const percentage = (score / maxScore) * 100;

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${categoryColors[category]}`} />
                      <span className="text-sm font-medium text-white capitalize">
                        {category}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-400">
                      {score} / {maxScore}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        category === 'engagement'
                          ? 'bg-blue-500'
                          : category === 'fit'
                          ? 'bg-purple-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Score Details */}
          {displayBreakdown.details.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white">Applied Rules</h3>
              <div className="space-y-2">
                {displayBreakdown.details.map((detail, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {detail.rule}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {detail.reason}
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-bold text-green-400">
                        +{detail.points}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayBreakdown.details.length === 0 && !breakdown && (
            <div className="text-center py-8 text-zinc-400">
              <p>No score calculated yet.</p>
              <p className="text-sm mt-2">Click "Recalculate Score" to generate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
