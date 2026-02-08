'use client';

import { useEffect, useState } from 'react';
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Filter, MoreHorizontal, DollarSign, Calendar, User, Building2, X, List, Columns, Pencil, Trash2, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DealCard } from '@/components/crm/deal-card';
import { DealColumn } from '@/components/crm/deal-column';
import { NewDealDialog } from '@/components/crm/new-deal-dialog';
import { EditDealDialog } from '@/components/crm/edit-deal-dialog';
import { DealFilters } from '@/components/crm/deal-filters';
import { DealDetailPanel } from '@/components/crm/deal-detail-panel';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SwipeableRow } from '@/components/ui/swipeable-row';

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
  const [defaultStage, setDefaultStage] = useState<string>('new-lead');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<string | null>(null);

  // Detect mobile and set default view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Default to list view on mobile
      if (mobile && viewMode === 'board') {
        setViewMode('list');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Custom collision detection that prioritizes column drops
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    // First, check if we're over any column (stage)
    const stageIds = stages.map(s => s.id);
    
    // Use pointerWithin for more accurate detection
    const pointerCollisions = pointerWithin(args);
    const columnCollision = pointerCollisions.find(c => stageIds.includes(c.id as string));
    
    if (columnCollision) {
      return [columnCollision];
    }
    
    // Fall back to rectIntersection for edge cases
    const rectCollisions = rectIntersection(args);
    const rectColumnCollision = rectCollisions.find(c => stageIds.includes(c.id as string));
    
    if (rectColumnCollision) {
      return [rectColumnCollision];
    }
    
    // Last resort: use closestCenter
    return closestCenter(args);
  };

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

  const getStageColor = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.color || '#71717a';
  };

  const getStageName = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.name || stageId;
  };

  const handleViewDeal = (deal: Deal) => {
    setSelectedDeal(deal);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
  };

  const handleDeleteDeal = async (deal: Deal) => {
    const supabase = createClient();
    
    // Optimistic removal
    setDeals(prev => prev.filter(d => d.id !== deal.id));

    const { error } = await supabase
      .from('crm_deals')
      .delete()
      .eq('id', deal.id);

    if (error) {
      // Revert on error
      setDeals(prev => [...prev, deal]);
      console.error('Failed to delete deal:', error);
    }
  };

  const handleMoveAllDeals = async (fromStageId: string, toStageId: string) => {
    const supabase = createClient();
    const dealsToMove = deals.filter(d => d.stage === fromStageId);
    
    if (dealsToMove.length === 0) return;

    // Optimistic update
    setDeals(prev => prev.map(d => 
      d.stage === fromStageId ? { ...d, stage: toStageId } : d
    ));

    // Update all deals in database
    const { error } = await supabase
      .from('crm_deals')
      .update({ 
        stage: toStageId,
        last_activity_at: new Date().toISOString()
      })
      .eq('stage', fromStageId);

    if (error) {
      // Revert on error
      setDeals(prev => prev.map(d => {
        const original = dealsToMove.find(dm => dm.id === d.id);
        return original ? { ...d, stage: fromStageId } : d;
      }));
      console.error('Failed to move deals:', error);
    } else {
      // Log activities for each moved deal
      const fromStageName = stages.find(s => s.id === fromStageId)?.name;
      const toStageName = stages.find(s => s.id === toStageId)?.name;
      
      await supabase.from('crm_activities').insert(
        dealsToMove.map(deal => ({
          deal_id: deal.id,
          type: 'stage-change',
          stage_from: fromStageId,
          stage_to: toStageId,
          subject: `Deal moved to ${toStageName} (bulk move from ${fromStageName})`,
        }))
      );
    }
  };

  const handleDeleteAllDeals = async (stageId: string) => {
    const supabase = createClient();
    const dealsToDelete = deals.filter(d => d.stage === stageId);
    
    if (dealsToDelete.length === 0) return;

    // Optimistic removal
    setDeals(prev => prev.filter(d => d.stage !== stageId));
    setConfirmDeleteAll(null);

    const { error } = await supabase
      .from('crm_deals')
      .delete()
      .eq('stage', stageId);

    if (error) {
      // Revert on error
      setDeals(prev => [...prev, ...dealsToDelete]);
      console.error('Failed to delete deals:', error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] lg:h-[calc(100vh-theme(spacing.32))] pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 lg:mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-sm text-gray-500">
            {filteredDeals.length} deals · {formatCurrency(filteredDeals.reduce((sum, d) => sum + (d.amount || 0), 0))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'board' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-500'
              }`}
              title="Board view"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setShowFilters(true)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              activeFilterCount > 0 
                ? 'bg-violet-50 border-violet-200 text-violet-700' 
                : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded">
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* Desktop New Deal button */}
          <button 
            onClick={() => setShowNewDeal(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* List View (Mobile-friendly with swipe gestures) */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredDeals.map((deal) => (
            <SwipeableRow
              key={deal.id}
              className="rounded-xl overflow-hidden"
              leftActions={[
                {
                  icon: <Eye className="w-5 h-5" />,
                  label: 'View',
                  color: 'text-white',
                  bgColor: 'bg-violet-500',
                  onClick: () => handleViewDeal(deal),
                },
              ]}
              rightActions={[
                {
                  icon: <Pencil className="w-5 h-5" />,
                  label: 'Edit',
                  color: 'text-white',
                  bgColor: 'bg-blue-500',
                  onClick: () => handleEditDeal(deal),
                },
                {
                  icon: <Trash2 className="w-5 h-5" />,
                  label: 'Delete',
                  color: 'text-white',
                  bgColor: 'bg-red-500',
                  onClick: () => {
                    if (confirm('Delete this deal?')) {
                      handleDeleteDeal(deal);
                    }
                  },
                },
              ]}
            >
              <div
                onClick={() => handleViewDeal(deal)}
                className="bg-white border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getStageColor(deal.stage) }}
                      />
                      <h3 className="font-medium text-gray-900 truncate">{deal.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{getStageName(deal.stage)}</p>
                    {deal.company && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{deal.company.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-semibold text-gray-900">
                      {deal.amount ? formatCurrency(deal.amount) : '—'}
                    </p>
                    {deal.expected_close_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SwipeableRow>
          ))}
          {filteredDeals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No deals found
            </div>
          )}
          {/* Swipe hint for first-time users */}
          {isMobile && filteredDeals.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              ← Swipe left to edit/delete • Swipe right to view →
            </p>
          )}
        </div>
      )}

      {/* Kanban Board (Desktop) */}
      {viewMode === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 h-full -mx-4 px-4 lg:mx-0 lg:px-0">
            {stages.map((stage) => (
              <DealColumn
                key={stage.id}
                stage={stage}
                deals={getDealsByStage(stage.id)}
                total={getStageTotal(stage.id)}
                allStages={stages}
                onAddDeal={(stageId) => {
                  setDefaultStage(stageId);
                  setShowNewDeal(true);
                }}
                onViewDeal={handleViewDeal}
                onEditDeal={handleEditDeal}
                onDeleteDeal={handleDeleteDeal}
                onMoveAllDeals={handleMoveAllDeals}
                onDeleteAllDeals={(stageId) => setConfirmDeleteAll(stageId)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal ? (
              <DealCard deal={activeDeal} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* New Deal Dialog */}
      {showNewDeal && (
        <NewDealDialog
          onClose={() => {
            setShowNewDeal(false);
            setDefaultStage('new-lead');
          }}
          onCreated={(newDeal) => {
            setDeals(prev => [newDeal, ...prev]);
            setShowNewDeal(false);
            setDefaultStage('new-lead');
          }}
          stages={stages}
          defaultStage={defaultStage}
        />
      )}

      {/* Edit Deal Dialog */}
      {editingDeal && (
        <EditDealDialog
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onUpdated={(updatedDeal) => {
            setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
            setEditingDeal(null);
            // Also update selectedDeal if it's the same deal
            if (selectedDeal?.id === updatedDeal.id) {
              setSelectedDeal(updatedDeal);
            }
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

      {/* Deal Detail Panel */}
      {selectedDeal && (
        <DealDetailPanel
          dealId={selectedDeal.id}
          onClose={() => setSelectedDeal(null)}
          onEdit={handleEditDeal}
          onDelete={handleDeleteDeal}
          stages={stages}
        />
      )}

      {/* Mobile FAB - Floating Action Button */}
      <button
        onClick={() => setShowNewDeal(true)}
        className="sm:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteAll}
        title="Delete All Deals"
        message={confirmDeleteAll ? `Are you sure you want to delete all ${getDealsByStage(confirmDeleteAll).length} deals in "${stages.find(s => s.id === confirmDeleteAll)?.name}"? This cannot be undone.` : ''}
        confirmText="Delete All"
        confirmVariant="danger"
        onConfirm={() => confirmDeleteAll && handleDeleteAllDeals(confirmDeleteAll)}
        onCancel={() => setConfirmDeleteAll(null)}
      />
    </div>
  );
}
