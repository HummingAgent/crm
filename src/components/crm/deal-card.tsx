'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Calendar, Building2, User, MoreHorizontal, Eye, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onView?: (deal: Deal) => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
}

export function DealCard({ deal, isDragging, onView, onEdit, onDelete }: DealCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-gray-300 transition-all',
        (isDragging || isSorting) && 'opacity-50 shadow-lg rotate-2',
        isDragging && 'shadow-2xl'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 
          className="font-medium text-gray-900 text-sm leading-tight pr-2 cursor-pointer hover:text-violet-600"
          onClick={(e) => {
            e.stopPropagation();
            onView?.(deal);
          }}
        >
          {deal.name}
        </h3>
        <div className="relative" ref={menuRef}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg -mr-1 -mt-1 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(deal);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(deal);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4" />
                Edit Deal
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this deal?')) {
                    onDelete?.(deal);
                  }
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Company */}
      {deal.company && (
        <div className="flex items-center gap-2 mb-2">
          {deal.company.logo_url ? (
            <img 
              src={deal.company.logo_url} 
              alt={deal.company.name}
              className="w-5 h-5 rounded object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-gray-400" />
            </div>
          )}
          <span className="text-xs text-gray-600 truncate">{deal.company.name}</span>
        </div>
      )}

      {/* Contact */}
      {deal.contact && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-[10px] font-medium text-violet-600">
              {deal.contact.first_name[0]}{deal.contact.last_name?.[0] || ''}
            </span>
          </div>
          <span className="text-xs text-gray-600 truncate">
            {deal.contact.first_name} {deal.contact.last_name}
          </span>
        </div>
      )}

      {/* Amount & Date */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
          <DollarSign className="w-3.5 h-3.5 text-green-600" />
          {deal.amount ? formatCurrency(deal.amount) : '—'}
        </div>
        {deal.expected_close_date && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {formatDate(deal.expected_close_date)}
          </div>
        )}
      </div>

      {/* Priority badge */}
      {deal.priority && deal.priority !== 'medium' && (
        <div className="mt-2">
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
            priorityColors[deal.priority as keyof typeof priorityColors] || priorityColors.medium
          )}>
            {deal.priority}
          </span>
        </div>
      )}
    </div>
  );
}
