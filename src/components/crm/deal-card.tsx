'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Calendar, Building2, MoreHorizontal, Eye, Pencil, Trash2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet, BottomSheetItem } from '@/components/ui/bottom-sheet';

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
  lead_score?: number | null;
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

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onView?: (deal: Deal) => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
}

const priorityConfig: Record<string, { color: string; label: string; badgeBg: string }> = {
  urgent: { color: 'bg-red-500', label: 'Urgent', badgeBg: 'bg-gradient-to-br from-red-500 to-red-600' },
  high: { color: 'bg-orange-500', label: 'High', badgeBg: 'bg-gradient-to-br from-orange-500 to-orange-600' },
  medium: { color: 'bg-yellow-500', label: 'Medium', badgeBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600' },
  low: { color: 'bg-blue-500', label: 'Low', badgeBg: 'bg-gradient-to-br from-blue-500 to-blue-600' },
};

export function DealCard({ deal, isDragging, onView, onEdit, onDelete }: DealCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const priority = priorityConfig[deal.priority] || priorityConfig.medium;

  const handleMenuClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isMobile) {
      setShowMobileSheet(true);
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowMobileSheet(false);
    if (confirm('Delete this deal?')) {
      onDelete?.(deal);
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onView?.(deal)}
        className={cn(
          'group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer',
          'bg-white border-[var(--border)] hover:border-[var(--muted-foreground)]',
          'shadow-sm hover:shadow-md',
          (isDragging || isSorting) && 'opacity-50 scale-105 shadow-2xl shadow-[var(--primary)]/20 border-[var(--primary)]/50'
        )}
      >
        {/* Priority indicator bar */}
        <div
          className={cn(
            'absolute left-0 top-3 bottom-3 w-1 rounded-full transition-opacity',
            priority.color,
            'opacity-60 group-hover:opacity-100'
          )}
        />

        {/* Header with title and menu */}
        <div className="flex items-start justify-between mb-2 pl-2">
          <h4 className="text-sm font-medium text-[var(--foreground)] pr-6 line-clamp-2">
            {deal.name || deal.company?.name || 'Untitled Deal'}
          </h4>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={handleMenuClick}
              onTouchEnd={handleMenuClick}
              className="p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] rounded transition-colors touch-manipulation absolute -top-1 -right-1"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showMenu && !isMobile && (
              <div className="absolute right-0 top-6 z-50 w-36 bg-[var(--card)] rounded-lg shadow-xl border border-[var(--border)] py-1 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={(e) => { e.stopPropagation(); onView?.(deal); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit?.(deal); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Company */}
        {deal.company && (
          <div className="flex items-center gap-2 mb-3 pl-2">
            {deal.company.logo_url ? (
              <img src={deal.company.logo_url} alt="" className="w-4 h-4 rounded object-cover" />
            ) : (
              <Building2 className="w-4 h-4 text-[var(--muted)]" />
            )}
            <span className="text-xs text-[var(--muted)] truncate">{deal.company.name}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pl-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-3">
            {/* Amount */}
            <div className="flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
              <DollarSign className="w-3.5 h-3.5 text-[var(--success)]" />
              {deal.amount ? formatCurrency(deal.amount) : '—'}
            </div>

            {/* Date */}
            {deal.expected_close_date && (
              <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <Calendar className="w-3 h-3" />
                {formatDate(deal.expected_close_date)}
              </div>
            )}
          </div>

          {/* Owner */}
          {deal.owner && (
            <div className="flex items-center gap-1.5 bg-[var(--card-hover)] rounded-full pl-1 pr-2 py-0.5">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: deal.owner.color }}
              >
                {deal.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="text-[10px] text-[var(--muted)] max-w-[50px] truncate">
                {deal.owner.name.split(' ')[0]}
              </span>
            </div>
          )}
        </div>

        {/* Priority badge - top right */}
        {deal.priority && deal.priority !== 'medium' && (
          <div 
            className={cn(
              'absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg',
              priority.badgeBg
            )}
          >
            {priority.label.toLowerCase()}
          </div>
        )}

        {/* Score badge */}
        {deal.lead_score && deal.lead_score > 0 && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
            {deal.lead_score}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      <BottomSheet isOpen={showMobileSheet} onClose={() => setShowMobileSheet(false)} title={deal.name}>
        <div className="py-2">
          <div className="px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-white">
                {deal.amount ? formatCurrency(deal.amount) : '—'}
              </span>
              {deal.expected_close_date && (
                <span className="text-sm text-zinc-500">Close: {formatDate(deal.expected_close_date)}</span>
              )}
            </div>
            {deal.company && <p className="text-sm text-zinc-500">{deal.company.name}</p>}
          </div>

          {deal.contact?.email && (
            <a href={`mailto:${deal.contact.email}`} className="w-full flex items-center gap-4 px-4 py-4 text-white active:bg-zinc-800">
              <Mail className="w-5 h-5 text-zinc-500" />
              <span className="font-medium">Email {deal.contact.first_name}</span>
            </a>
          )}

          <div className="border-t border-zinc-800" />
          <BottomSheetItem icon={<Eye className="w-5 h-5" />} label="View Details" onClick={() => { setShowMobileSheet(false); onView?.(deal); }} />
          <BottomSheetItem icon={<Pencil className="w-5 h-5" />} label="Edit Deal" onClick={() => { setShowMobileSheet(false); onEdit?.(deal); }} />
          <div className="border-t border-zinc-800 mt-2" />
          <BottomSheetItem icon={<Trash2 className="w-5 h-5" />} label="Delete Deal" variant="destructive" onClick={handleDelete} />
        </div>
      </BottomSheet>
    </>
  );
}
