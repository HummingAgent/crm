'use client';

import { useEffect, useState } from 'react';
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Filter, DollarSign, User, Building2, X, List, Columns, Pencil, Trash2, Eye, Flame, Sun, Users, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DealCard } from '@/components/crm/deal-card';
import { DealColumn } from '@/components/crm/deal-column';
import { NewDealDialog } from '@/components/crm/new-deal-dialog';
import { EditDealDialog } from '@/components/crm/edit-deal-dialog';
import { DealFilters } from '@/components/crm/deal-filters';
import { DealDetailPanel } from '@/components/crm/deal-detail-panel';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { cn } from '@/lib/utils';

interface Pipeline {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  position: number;
  is_default: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  color: string;
  avatar_url: string | null;
}

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
  priority: string;
  lead_source: string | null;
  deal_type: string | null;
  last_activity_at: string | null;
  pipeline_id: string | null;
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
  owner?: TeamMember;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  pipeline_id: string | null;
}

const DEFAULT_STAGES: PipelineStage[] = [
  { id: 'new-lead', name: 'New Leads', color: '#6366F1', position: 1, is_won: false, is_lost: false, pipeline_id: null },
  { id: 'discovery-scheduled', name: 'Discovery Scheduled', color: '#3B82F6', position: 2, is_won: false, is_lost: false, pipeline_id: null },
  { id: 'discovery-complete', name: 'Discovery Complete', color: '#06B6D4', position: 3, is_won: false, is_lost: false, pipeline_id: null },
  { id: 'proposal-draft', name: 'Create Proposal', color: '#F59E0B', position: 4, is_won: false, is_lost: false, pipeline_id: null },
  { id: 'proposal-sent', name: 'Proposal Sent', color: '#F97316', position: 5, is_won: false, is_lost: false, pipeline_id: null },
  { id: 'contract-sent', name: 'Contract Sent', color: '#EC4899', position: 6, is_won: false, is_lost: false, pipeline_id: null },
  { id: 'closed-won', name: 'Closed Won', color: '#10B981', position: 7, is_won: true, is_lost: false, pipeline_id: null },
];

interface Filters {
  stages: string[];
  priorities: string[];
  sources: string[];
  minAmount: number | null;
  maxAmount: number | null;
  ownerId: string | null;
}

const emptyFilters: Filters = {
  stages: [],
  priorities: [],
  sources: [],
  minAmount: null,
  maxAmount: null,
  ownerId: null,
};

const PIPELINE_STORAGE_KEY = 'crm-selected-pipeline';

const pipelineIcons: Record<string, React.ReactNode> = {
  flame: <Flame className="w-4 h-4" />,
  sun: <Sun className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allStages, setAllStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [stages, setStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myPipelineOnly, setMyPipelineOnly] = useState(false);
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
      if (mobile && viewMode === 'board') {
        setViewMode('list');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved pipeline from localStorage
  useEffect(() => {
    const savedPipelineId = localStorage.getItem(PIPELINE_STORAGE_KEY);
    if (savedPipelineId) {
      setSelectedPipelineId(savedPipelineId);
    }
  }, []);

  // Save selected pipeline to localStorage
  useEffect(() => {
    if (selectedPipelineId) {
      localStorage.setItem(PIPELINE_STORAGE_KEY, selectedPipelineId);
    }
  }, [selectedPipelineId]);

  // Filter stages by selected pipeline
  useEffect(() => {
    if (selectedPipelineId) {
      const filteredStages = allStages.filter(
        s => s.pipeline_id === selectedPipelineId || s.pipeline_id === null
      );
      const pipelineSpecificStages = filteredStages.filter(s => s.pipeline_id === selectedPipelineId);
      setStages(pipelineSpecificStages.length > 0 ? pipelineSpecificStages : filteredStages);
      
      if (pipelineSpecificStages.length > 0) {
        setDefaultStage(pipelineSpecificStages[0].id);
      }
    } else {
      setStages(allStages);
    }
  }, [selectedPipelineId, allStages]);

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

  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const stageIds = stages.map(s => s.id);
    const pointerCollisions = pointerWithin(args);
    const columnCollision = pointerCollisions.find(c => stageIds.includes(c.id as string));
    
    if (columnCollision) return [columnCollision];
    
    const rectCollisions = rectIntersection(args);
    const rectColumnCollision = rectCollisions.find(c => stageIds.includes(c.id as string));
    
    if (rectColumnCollision) return [rectColumnCollision];
    
    return closestCenter(args);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    
    const { data: pipelinesData } = await supabase
      .from('crm_pipelines')
      .select('*')
      .eq('is_active', true)
      .order('position');

    if (pipelinesData && pipelinesData.length > 0) {
      setPipelines(pipelinesData);
      const savedPipelineId = localStorage.getItem(PIPELINE_STORAGE_KEY);
      if (!savedPipelineId) {
        const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0];
        setSelectedPipelineId(defaultPipeline.id);
      } else {
        const pipelineExists = pipelinesData.some(p => p.id === savedPipelineId);
        if (!pipelineExists) {
          const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0];
          setSelectedPipelineId(defaultPipeline.id);
        }
      }
    }

    const { data: dealsData } = await supabase
      .from('crm_deals')
      .select(`
        *,
        company:crm_companies(id, name, logo_url),
        contact:crm_contacts(id, first_name, last_name, email),
        owner:crm_team_members(id, name, email, color, avatar_url)
      `)
      .order('created_at', { ascending: false });

    const { data: stagesData } = await supabase
      .from('crm_pipeline_stages')
      .select('*')
      .order('position');

    const { data: teamData } = await supabase
      .from('crm_team_members')
      .select('id, name, email, color, avatar_url')
      .eq('is_active', true)
      .order('name');

    const { data: { user } } = await supabase.auth.getUser();
    if (user && teamData) {
      const currentMember = teamData.find(m => m.email === user.email);
      if (currentMember) {
        setCurrentUserId(currentMember.id);
      }
    }

    if (dealsData) setDeals(dealsData);
    if (stagesData && stagesData.length > 0) setAllStages(stagesData);
    if (teamData) setTeamMembers(teamData);
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
    
    if (!stages.find(s => s.id === newStage)) return;

    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    setDeals(prev => prev.map(d => 
      d.id === dealId ? { ...d, stage: newStage } : d
    ));

    const supabase = createClient();
    const { error } = await supabase
      .from('crm_deals')
      .update({ 
        stage: newStage,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', dealId);

    if (error) {
      setDeals(prev => prev.map(d => 
        d.id === dealId ? { ...d, stage: deal.stage } : d
      ));
    } else {
      await supabase.from('crm_activities').insert({
        deal_id: dealId,
        type: 'stage-change',
        stage_from: deal.stage,
        stage_to: newStage,
        subject: `Deal moved to ${stages.find(s => s.id === newStage)?.name}`,
      });
    }
  };

  const filteredDeals = deals.filter(deal => {
    if (selectedPipelineId && deal.pipeline_id !== selectedPipelineId) return false;
    if (myPipelineOnly && currentUserId && deal.owner_id !== currentUserId) return false;
    if (filters.stages.length > 0 && !filters.stages.includes(deal.stage)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(deal.priority)) return false;
    if (filters.sources.length > 0 && !filters.sources.includes(deal.lead_source || '')) return false;
    if (filters.minAmount && (deal.amount || 0) < filters.minAmount) return false;
    if (filters.maxAmount && (deal.amount || 0) > filters.maxAmount) return false;
    if (filters.ownerId && deal.owner_id !== filters.ownerId) return false;
    return true;
  });

  const activeFilterCount = 
    filters.stages.length + 
    filters.priorities.length + 
    filters.sources.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0);

  const getDealsByStage = (stageId: string) => filteredDeals.filter(d => d.stage === stageId);
  const getStageTotal = (stageId: string) => getDealsByStage(stageId).reduce((sum, d) => sum + (d.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePipelineChange = (pipelineId: string) => setSelectedPipelineId(pipelineId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getStageColor = (stageId: string) => stages.find(s => s.id === stageId)?.color || '#71717a';
  const getStageName = (stageId: string) => stages.find(s => s.id === stageId)?.name || stageId;

  const handleViewDeal = (deal: Deal) => setSelectedDeal(deal);
  const handleEditDeal = (deal: Deal) => setEditingDeal(deal);

  const handleDeleteDeal = async (deal: Deal) => {
    const supabase = createClient();
    setDeals(prev => prev.filter(d => d.id !== deal.id));

    const { error } = await supabase.from('crm_deals').delete().eq('id', deal.id);
    if (error) {
      setDeals(prev => [...prev, deal]);
    }
  };

  const handleMoveAllDeals = async (fromStageId: string, toStageId: string) => {
    const supabase = createClient();
    const dealsToMove = deals.filter(d => d.stage === fromStageId);
    if (dealsToMove.length === 0) return;

    setDeals(prev => prev.map(d => d.stage === fromStageId ? { ...d, stage: toStageId } : d));

    const { error } = await supabase
      .from('crm_deals')
      .update({ stage: toStageId, last_activity_at: new Date().toISOString() })
      .eq('stage', fromStageId);

    if (error) {
      setDeals(prev => prev.map(d => {
        const original = dealsToMove.find(dm => dm.id === d.id);
        return original ? { ...d, stage: fromStageId } : d;
      }));
    }
  };

  const handleDeleteAllDeals = async (stageId: string) => {
    const supabase = createClient();
    const dealsToDelete = deals.filter(d => d.stage === stageId);
    if (dealsToDelete.length === 0) return;

    setDeals(prev => prev.filter(d => d.stage !== stageId));
    setConfirmDeleteAll(null);

    const { error } = await supabase.from('crm_deals').delete().eq('stage', stageId);
    if (error) {
      setDeals(prev => [...prev, ...dealsToDelete]);
    }
  };

  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="min-h-[calc(100vh-12rem)] lg:h-[calc(100vh-theme(spacing.32))] pb-20 lg:pb-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">Sales Pipeline</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-[var(--muted)]">{filteredDeals.length} deals</span>
              <span className="text-[var(--muted)]">•</span>
              <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(totalValue)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* My Pipeline Toggle */}
            {currentUserId && (
              <button
                onClick={() => setMyPipelineOnly(!myPipelineOnly)}
                className={cn(
                  'btn',
                  myPipelineOnly ? 'btn-primary' : 'btn-secondary'
                )}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">My Deals</span>
              </button>
            )}

            {/* View Toggle */}
            <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'list' 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
              >
                <List className="w-4 h-4" />
                <span className="hidden lg:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'board' 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                )}
              >
                <Columns className="w-4 h-4" />
                <span className="hidden lg:inline">Board</span>
              </button>
            </div>
            
            {/* Filter */}
            <button 
              onClick={() => setShowFilters(true)}
              className={cn(
                'btn',
                activeFilterCount > 0 ? 'btn-primary' : 'btn-secondary'
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-xs font-medium rounded">
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            {/* New Deal */}
            <button 
              onClick={() => setShowNewDeal(true)}
              className="btn btn-primary hidden sm:flex"
            >
              <Plus className="w-4 h-4" />
              New Deal
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Tabs */}
      {pipelines.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {pipelines.map((pipeline) => {
            const isSelected = selectedPipelineId === pipeline.id;
            const dealCount = deals.filter(d => d.pipeline_id === pipeline.id).length;
            return (
              <button
                key={pipeline.id}
                onClick={() => handlePipelineChange(pipeline.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all whitespace-nowrap',
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : 'text-[var(--muted)] bg-[var(--card)] border-[var(--border)] hover:border-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
                style={isSelected ? { backgroundColor: pipeline.color } : {}}
              >
                <span style={!isSelected ? { color: pipeline.color } : {}}>
                  {pipelineIcons[pipeline.icon] || pipelineIcons.flame}
                </span>
                {pipeline.name}
                <span className={cn(
                  'px-1.5 py-0.5 text-xs font-medium rounded',
                  isSelected ? 'bg-white/20 text-white' : 'bg-[var(--card-hover)] text-[var(--muted)]'
                )}>
                  {dealCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredDeals.map((deal) => (
              <SwipeableRow
                key={deal.id}
                className="overflow-hidden"
                leftActions={[
                  {
                    icon: <Eye className="w-5 h-5" />,
                    label: 'View',
                    color: 'text-white',
                    bgColor: 'bg-[var(--primary)]',
                    onClick: () => handleViewDeal(deal),
                  },
                ]}
                rightActions={[
                  {
                    icon: <Pencil className="w-5 h-5" />,
                    label: 'Edit',
                    color: 'text-white',
                    bgColor: 'bg-[var(--info)]',
                    onClick: () => handleEditDeal(deal),
                  },
                  {
                    icon: <Trash2 className="w-5 h-5" />,
                    label: 'Delete',
                    color: 'text-white',
                    bgColor: 'bg-[var(--danger)]',
                    onClick: () => {
                      if (confirm('Delete this deal?')) handleDeleteDeal(deal);
                    },
                  },
                ]}
              >
                <div
                  onClick={() => handleViewDeal(deal)}
                  className="flex items-center justify-between gap-4 p-4 bg-[var(--card)] hover:bg-[var(--card-hover)] cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="stage-dot"
                        style={{ backgroundColor: getStageColor(deal.stage) }}
                      />
                      <h3 className="font-medium text-[var(--foreground)] truncate">{deal.name}</h3>
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-1">{getStageName(deal.stage)}</p>
                    <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                      {deal.company && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{deal.company.name}</span>
                        </div>
                      )}
                      {deal.owner && (
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-semibold"
                            style={{ backgroundColor: deal.owner.color }}
                          >
                            {deal.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="truncate max-w-[80px]">{deal.owner.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {deal.amount ? formatCurrency(deal.amount) : '—'}
                    </p>
                    {deal.expected_close_date && (
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {new Date(deal.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </SwipeableRow>
            ))}
            {filteredDeals.length === 0 && (
              <div className="empty-state py-16">
                <TrendingUp className="empty-state-icon" />
                <p className="empty-state-title">No deals found</p>
                <p className="empty-state-description">Create your first deal to get started</p>
                <button 
                  onClick={() => setShowNewDeal(true)}
                  className="btn btn-primary mt-4"
                >
                  <Plus className="w-4 h-4" />
                  New Deal
                </button>
              </div>
            )}
          </div>
          {isMobile && filteredDeals.length > 0 && (
            <p className="text-center text-xs text-[var(--muted-foreground)] py-3 border-t border-[var(--border-subtle)]">
              ← Swipe for actions →
            </p>
          )}
        </div>
      )}

      {/* Kanban Board */}
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
            {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Dialogs */}
      {showNewDeal && (
        <NewDealDialog
          onClose={() => { setShowNewDeal(false); setDefaultStage(stages[0]?.id || 'new-lead'); }}
          onCreated={(newDeal) => { setDeals(prev => [newDeal, ...prev]); setShowNewDeal(false); setDefaultStage(stages[0]?.id || 'new-lead'); }}
          stages={stages}
          defaultStage={defaultStage}
          pipelineId={selectedPipelineId}
        />
      )}

      {editingDeal && (
        <EditDealDialog
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onUpdated={(updatedDeal) => {
            setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
            setEditingDeal(null);
            if (selectedDeal?.id === updatedDeal.id) setSelectedDeal(updatedDeal);
          }}
          stages={stages}
        />
      )}

      {showFilters && (
        <DealFilters
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {selectedDeal && (
        <DealDetailPanel
          dealId={selectedDeal.id}
          onClose={() => setSelectedDeal(null)}
          onEdit={handleEditDeal}
          onDelete={handleDeleteDeal}
          stages={stages}
        />
      )}

      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewDeal(true)}
        className="sm:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-[var(--primary)] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 touch-feedback"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Confirm Delete Modal */}
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
