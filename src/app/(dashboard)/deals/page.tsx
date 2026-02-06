'use client';

import { useEffect, useState } from 'react';
import { 
  DndContext, 
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Filter, MoreHorizontal, DollarSign, Calendar, User, Building2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DealCard } from '@/components/crm/deal-card';
import { DealColumn } from '@/components/crm/deal-column';
import { NewDealDialog } from '@/components/crm/new-deal-dialog';
import { DealFilters } from '@/components/crm/deal-filters';

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

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'new-lead', name: 'New Leads', color: '#8b5cf6', position: 1, is_won: false, is_lost: false },
  { id: 'discovery-scheduled', name: 'Discovery Scheduled', color: '#3b82f6', position: 2, is_won: false, is_lost: false },
  { id: 'discovery-complete', name: 'Discovery Complete', color: '#06b6d4', position: 3, is_won: false, is_lost: false },
  { id: 'proposal-draft', name: 'Create Proposal', color: '#f59e0b', position: 4, is_won: false, is_lost: false },
  { id: 'proposal-sent', name: 'Proposal Sent', color: '#f97316', position: 5, is_won: false, is_lost: false },
  { id: 'contract-sent', name: 'Contract Sent', color: '#ec4899', position: 6, is_won: false, is_lost: false },
  { id: 'closed-won', name: 'Closed Won', color: '#22c55e', position: 7, is_won: true, is_lost: false },
];

interface Filters {
  stages: string[];
  priorities: string[];
  sources: string[];
  minAmount: number | null;
  maxAmount: number | null;
}

const emptyFilters: Filters = {
  stages: [],
  priorities: [],
  sources: [],
  minAmount: null,
  maxAmount: null,
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    // Load deals with company and contact info
    const { data: dealsData, error: dealsError } = await supabase
      .from('crm_deals')
      .select(`
        *,
        company:crm_companies(id, name, logo_url),
        contact:crm_contacts(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false });

    // Load custom stages if any
    const { data: stagesData } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .order('position');

    if (dealsData) setDeals(dealsData);
    if (stagesData && stagesData.length > 0) setStages(stagesData);
    setLoading(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id);
    if (deal) setActiveDeal(deal);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStage = over.id as string;
    
    // Check if dropped on a column
    if (!stages.find(s => s.id === newStage)) return;

    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    setDeals(prev => prev.map(d => 
      d.id === dealId ? { ...d, stage: newStage } : d
    ));

    // Update in database
    const supabase = createClient();
    const { error } = await supabase
      .from('crm_deals')
      .update({ 
        stage: newStage,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', dealId);

    if (error) {
      // Revert on error
      setDeals(prev => prev.map(d => 
        d.id === dealId ? { ...d, stage: deal.stage } : d
      ));
    } else {
      // Log the activity
      await supabase.from('crm_activities').insert({
        deal_id: dealId,
        type: 'stage-change',
        stage_from: deal.stage,
        stage_to: newStage,
        subject: `Deal moved to ${stages.find(s => s.id === newStage)?.name}`,
      });
    }
  };

  // Apply filters to deals
  const filteredDeals = deals.filter(deal => {
    // Stage filter (only if specific stages selected)
    if (filters.stages.length > 0 && !filters.stages.includes(deal.stage)) {
      return false;
    }
    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(deal.priority)) {
      return false;
    }
    // Source filter
    if (filters.sources.length > 0 && !filters.sources.includes(deal.lead_source || '')) {
      return false;
    }
    // Amount range
    if (filters.minAmount && (deal.amount || 0) < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount && (deal.amount || 0) > filters.maxAmount) {
      return false;
    }
    return true;
  });

  const activeFilterCount = 
    filters.stages.length + 
    filters.priorities.length + 
    filters.sources.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0);

  const getDealsByStage = (stageId: string) => {
    return filteredDeals.filter(d => d.stage === stageId);
  };

  const getStageTotal = (stageId: string) => {
    return getDealsByStage(stageId).reduce((sum, d) => sum + (d.amount || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.32))]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {deals.length} deals · {formatCurrency(deals.reduce((sum, d) => sum + (d.amount || 0), 0))} total value
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              activeFilterCount > 0 
                ? 'bg-violet-50 border-violet-200 text-violet-700' 
                : 'text-gray-600 hover:text-gray-900 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button 
              onClick={() => setFilters(emptyFilters)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Clear filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setShowNewDeal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {stages.map((stage) => (
            <DealColumn
              key={stage.id}
              stage={stage}
              deals={getDealsByStage(stage.id)}
              total={getStageTotal(stage.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <DealCard deal={activeDeal} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Deal Dialog */}
      {showNewDeal && (
        <NewDealDialog
          onClose={() => setShowNewDeal(false)}
          onCreated={(newDeal) => {
            setDeals(prev => [newDeal, ...prev]);
            setShowNewDeal(false);
          }}
          stages={stages}
        />
      )}

      {/* Filters Panel */}
      {showFilters && (
        <DealFilters
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
