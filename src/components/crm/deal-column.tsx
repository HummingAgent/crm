'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DealCard } from './deal-card';

interface Deal {
  id: string;
  name: string;
  description: string | null;
  stage: string;
  amount: number | null;
  expected_close_date: string | null;
  company_id: string | null;
  primary_contact_id: string | null;
  priority: string;
  lead_source: string | null;
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
  onAddDeal?: (stageId: string) => void;
  onViewDeal?: (deal: Deal) => void;
  onEditDeal?: (deal: Deal) => void;
  onDeleteDeal?: (deal: Deal) => void;
}

export function DealColumn({ stage, deals, total, onAddDeal, onViewDeal, onEditDeal, onDeleteDeal }: DealColumnProps) {
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

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-gray-900 text-sm">{stage.name}</h3>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
            {deals.length}
          </span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Total value */}
      <div className="px-1 mb-3">
        <span className="text-sm font-medium text-gray-500">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-[200px] p-2 rounded-lg transition-colors',
          isOver ? 'bg-violet-50 border-2 border-dashed border-violet-300' : 'bg-gray-50/50'
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
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <p className="text-sm">No deals</p>
          </div>
        )}

        {/* Add deal button */}
        <button 
          onClick={() => onAddDeal?.(stage.id)}
          className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg border border-dashed border-gray-300 hover:border-violet-300 transition-colors mt-auto"
        >
          <Plus className="w-4 h-4" />
          Add deal
        </button>
      </div>
    </div>
  );
}
