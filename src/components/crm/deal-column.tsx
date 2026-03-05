'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, ChevronDown, ChevronRight, ArrowRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DealCard } from './deal-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Deal {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  amount: number | null;
  expected_close_date: string | null;
  company_id: string | null;
  primary_contact_id: string | null;
  owner_id: string | null;
  pipeline_id: string | null;
  priority: string;
  lead_source: string | null;
  deal_type: string | null;
  last_activity_at: string | null;
  company?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  contact?: {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string | null;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
    color: string;
    avatar_url: string | null;
  };
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

interface DealColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  total: number;
  allStages?: PipelineStage[];
  onAddDeal?: (stageId: string) => void;
  onViewDeal?: (deal: Deal) => void;
  onEditDeal?: (deal: Deal) => void;
  onDeleteDeal?: (deal: Deal) => void;
  onMoveAllDeals?: (fromStageId: string, toStageId: string) => void;
  onDeleteAllDeals?: (stageId: string) => void;
}

export function DealColumn({ 
  stage, 
  deals, 
  total, 
  allStages = [],
  onAddDeal, 
  onViewDeal, 
  onEditDeal, 
  onDeleteDeal,
  onMoveAllDeals,
  onDeleteAllDeals,
}: DealColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  const otherStages = allStages.filter(s => s.id !== stage.id);

  // Convert hex to RGB for tinted background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 200, g: 200, b: 200 };
  };

  const rgb = hexToRgb(stage.color);
  const tintedBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;

  if (isCollapsed) {
    return (
      <div 
        className="flex-shrink-0 w-10 rounded-xl cursor-pointer hover:opacity-80 transition-all"
        style={{ backgroundColor: tintedBg }}
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex flex-col items-center py-3 gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-xs font-medium text-[var(--foreground)] writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
            {stage.name}
          </span>
          <span className="px-1.5 py-0.5 bg-white/50 rounded text-[10px] font-medium text-[var(--foreground)]">
            {deals.length}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col w-72 sm:w-80 min-w-72 sm:min-w-80 h-full rounded-xl transition-all duration-200',
        isOver && 'ring-2 ring-[var(--primary)]/50'
      )}
      style={{ backgroundColor: tintedBg }}
    >
      {/* Column Header */}
      <div className="flex flex-col px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            <h3 className="font-semibold text-[var(--foreground)] text-sm uppercase tracking-wide" style={{ color: stage.color }}>
              {stage.name}
            </h3>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-white/60 text-[var(--foreground)]">
              {deals.length}
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/50 rounded transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-[var(--card)] border-[var(--border)]">
              <DropdownMenuItem onClick={() => onAddDeal?.(stage.id)} className="text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]">
                <Plus className="w-4 h-4 mr-2" />
                Add deal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCollapsed(true)} className="text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]">
                <ChevronRight className="w-4 h-4 mr-2" />
                Collapse
              </DropdownMenuItem>
              
              {deals.length > 0 && otherStages.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-[var(--border)]" />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Move all to...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44 bg-[var(--card)] border-[var(--border)]">
                      {otherStages.map((targetStage) => (
                        <DropdownMenuItem 
                          key={targetStage.id}
                          onClick={() => onMoveAllDeals?.(stage.id, targetStage.id)}
                          className="text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                        >
                          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: targetStage.color }} />
                          {targetStage.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              
              {deals.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-[var(--border)]" />
                  <DropdownMenuItem 
                    onClick={() => onDeleteAllDeals?.(stage.id)}
                    className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete all ({deals.length})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[100px]">
          <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            {deals.map((deal) => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                onView={onViewDeal}
                onEdit={onEditDeal}
                onDelete={onDeleteDeal}
              />
            ))}
          </SortableContext>

          {deals.length === 0 && (
            <div className="flex items-center justify-center h-24 text-[var(--muted)] text-sm">
              No deals
            </div>
          )}
        </div>
      </div>

      {/* Add Deal Button (bottom) */}
      <div className="p-2">
        <button 
          onClick={() => onAddDeal?.(stage.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New task
        </button>
      </div>
    </div>
  );
}
