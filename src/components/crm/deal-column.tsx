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

  if (isCollapsed) {
    return (
      <div 
        className="flex-shrink-0 w-10 bg-zinc-900/50 border border-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800/50 transition-all"
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex flex-col items-center py-3 gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-xs font-medium text-zinc-400 writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
            {stage.name}
          </span>
          <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-medium text-zinc-400">
            {deals.length}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col w-72 sm:w-80 min-w-72 sm:min-w-80 h-full rounded-xl transition-all duration-200',
        'bg-zinc-900/50 border border-zinc-800/50',
        isOver && 'ring-2 ring-indigo-500/50 bg-indigo-950/20'
      )}
    >
      {/* Column Header */}
      <div className="flex flex-col px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-0.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 transition-colors"
              title="Collapse column"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
            <h3 className="font-medium text-white text-sm">{stage.name}</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {deals.length}
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-zinc-800 border-zinc-700">
              <DropdownMenuItem onClick={() => onAddDeal?.(stage.id)} className="text-zinc-300 hover:text-white hover:bg-zinc-700">
                <Plus className="w-4 h-4 mr-2" />
                Add deal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCollapsed(true)} className="text-zinc-300 hover:text-white hover:bg-zinc-700">
                <ChevronRight className="w-4 h-4 mr-2" />
                Collapse
              </DropdownMenuItem>
              
              {deals.length > 0 && otherStages.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-zinc-300 hover:text-white hover:bg-zinc-700">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Move all to...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44 bg-zinc-800 border-zinc-700">
                      {otherStages.map((targetStage) => (
                        <DropdownMenuItem 
                          key={targetStage.id}
                          onClick={() => onMoveAllDeals?.(stage.id, targetStage.id)}
                          className="text-zinc-300 hover:text-white hover:bg-zinc-700"
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
                  <DropdownMenuSeparator className="bg-zinc-700" />
                  <DropdownMenuItem 
                    onClick={() => onDeleteAllDeals?.(stage.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete all ({deals.length})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Total value */}
        <span className="text-sm text-zinc-500 mt-1 ml-9">
          {formatCurrency(total)}
        </span>
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
            <div className="flex items-center justify-center h-24 text-zinc-600 text-sm">
              No deals
            </div>
          )}
        </div>
      </div>

      {/* Add Deal Button (bottom) */}
      <div className="p-2 border-t border-zinc-800/50">
        <button 
          onClick={() => onAddDeal?.(stage.id)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add deal
        </button>
      </div>
    </div>
  );
}
