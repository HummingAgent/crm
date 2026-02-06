'use client';

import { useState } from 'react';
import { X, Filter, ChevronDown } from 'lucide-react';

interface DealFiltersProps {
  filters: {
    stages: string[];
    priorities: string[];
    sources: string[];
    minAmount: number | null;
    maxAmount: number | null;
  };
  onChange: (filters: DealFiltersProps['filters']) => void;
  onClose: () => void;
}

const STAGES = [
  { id: 'new-lead', name: 'New Leads' },
  { id: 'discovery-scheduled', name: 'Discovery Scheduled' },
  { id: 'discovery-complete', name: 'Discovery Complete' },
  { id: 'proposal-draft', name: 'Create Proposal' },
  { id: 'proposal-sent', name: 'Proposal Sent' },
  { id: 'contract-sent', name: 'Contract Sent' },
  { id: 'closed-won', name: 'Closed Won' },
  { id: 'closed-lost', name: 'Closed Lost' },
];

const PRIORITIES = [
  { id: 'urgent', name: 'Urgent', color: 'bg-red-100 text-red-700' },
  { id: 'high', name: 'High', color: 'bg-orange-100 text-orange-700' },
  { id: 'medium', name: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { id: 'low', name: 'Low', color: 'bg-gray-100 text-gray-600' },
];

const SOURCES = [
  { id: 'inbound', name: 'Inbound' },
  { id: 'outbound-linkedin', name: 'Outbound - LinkedIn' },
  { id: 'outbound-email', name: 'Outbound - Email' },
  { id: 'referral', name: 'Referral' },
  { id: 'website', name: 'Website' },
  { id: 'event', name: 'Event' },
];

export function DealFilters({ filters, onChange, onClose }: DealFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const toggleStage = (stageId: string) => {
    const newStages = localFilters.stages.includes(stageId)
      ? localFilters.stages.filter(s => s !== stageId)
      : [...localFilters.stages, stageId];
    setLocalFilters({ ...localFilters, stages: newStages });
  };

  const togglePriority = (priorityId: string) => {
    const newPriorities = localFilters.priorities.includes(priorityId)
      ? localFilters.priorities.filter(p => p !== priorityId)
      : [...localFilters.priorities, priorityId];
    setLocalFilters({ ...localFilters, priorities: newPriorities });
  };

  const toggleSource = (sourceId: string) => {
    const newSources = localFilters.sources.includes(sourceId)
      ? localFilters.sources.filter(s => s !== sourceId)
      : [...localFilters.sources, sourceId];
    setLocalFilters({ ...localFilters, sources: newSources });
  };

  const applyFilters = () => {
    onChange(localFilters);
    onClose();
  };

  const clearFilters = () => {
    const cleared = {
      stages: [],
      priorities: [],
      sources: [],
      minAmount: null,
      maxAmount: null,
    };
    setLocalFilters(cleared);
    onChange(cleared);
  };

  const activeCount = 
    localFilters.stages.length + 
    localFilters.priorities.length + 
    localFilters.sources.length +
    (localFilters.minAmount ? 1 : 0) +
    (localFilters.maxAmount ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Filters</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Stages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => toggleStage(stage.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    localFilters.stages.includes(stage.id)
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority.id}
                  onClick={() => togglePriority(priority.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    localFilters.priorities.includes(priority.id)
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {priority.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source</label>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((source) => (
                <button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    localFilters.sources.includes(source.id)
                      ? 'bg-violet-100 border-violet-300 text-violet-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {source.name}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deal Value</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={localFilters.minAmount || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      minAmount: e.target.value ? Number(e.target.value) : null 
                    })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>
              <span className="text-gray-400">—</span>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={localFilters.maxAmount || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      maxAmount: e.target.value ? Number(e.target.value) : null 
                    })}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
