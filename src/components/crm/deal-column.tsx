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
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  const otherStages = allStages.filter(s => s.id !== stage.id);

  if (isCollapsed) {
    return (
      <div 
        className="flex-shrink-0 w-10 bg-[var(--card)] border border-[var(--border)] rounded-lg cursor-pointer hover:bg-[var(--card-hover)] transition-colors"
        onClick={() => setIsCollapsed(false)}
      >
        <div className="flex flex-col items-center py-3 gap-2">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-xs font-medium text-[var(--muted)] writing-mode-vertical rotate-180" style={{ writingMode: 'vertical-rl' }}>
            {stage.name}
          </span>
          <span className="px-1.5 py-0.5 bg-[var(--card-hover)] rounded text-[10px] font-medium text-[var(--muted)]">
            {deals.length}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted-foreground)] mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-column flex-shrink-0">
      {/* Column Header */}
      <div className="kanban-column-header">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCollapsed(true)}
              className="p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded hover:bg-[var(--card-hover)] transition-colors"
              title="Collapse column"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-[var(--foreground)] text-sm">{stage.name}</h3>
            <span className="px-1.5 py-0.5 bg-[var(--card-hover)] rounded text-xs font-medium text-[var(--muted)]">
              {deals.length}
            </span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded hover:bg-[var(--card-hover)] transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onAddDeal?.(stage.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add deal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCollapsed(true)}>
                <ChevronRight className="w-4 h-4 mr-2" />
                Collapse column
              </DropdownMenuItem>
              
              {deals.length > 0 && otherStages.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Move all to...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44">
                      {otherStages.map((targetStage) => (
                        <DropdownMenuItem 
                          key={targetStage.id}
                          onClick={() => onMoveAllDeals?.(stage.id, targetStage.id)}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: targetStage.color }}
                          />
                          {targetStage.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              
              {deals.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    variant="destructive"
                    onClick={() => onDeleteAllDeals?.(stage.id)}
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
        <span className="text-sm font-medium text-[var(--muted)]">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'kanban-column-content',
          isOver && 'bg-[var(--primary-light)] border-2 border-dashed border-[var(--primary-muted)] rounded-lg'
        )}
      >
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
          <div className="flex flex-col items-center justify-center py-8 text-[var(--muted-foreground)]">
            <p className="text-sm">No deals</p>
          </div>
        )}

        {/* Add deal button */}
        <button 
          onClick={() => onAddDeal?.(stage.id)}
          className="flex items-center justify-center gap-2 w-full py-2 text-sm text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--primary-muted)] transition-colors mt-2"
        >
          <Plus className="w-4 h-4" />
          Add deal
        </button>
      </div>
    </div>
  );
}
