'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Calendar, Building2, User, MoreHorizontal, Eye, Pencil, Trash2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomSheet, BottomSheetItem } from '@/components/ui/bottom-sheet';
import { ScoreIndicator } from './score-badge';

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

export function DealCard({ deal, isDragging, onView, onEdit, onDelete }: DealCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    low: 'bg-[var(--card-hover)] text-[var(--muted)]',
    medium: 'bg-[var(--info-light)] text-[var(--info)]',
    high: 'bg-[var(--warning-light)] text-[var(--warning)]',
    urgent: 'bg-[var(--danger-light)] text-[var(--danger)]',
  };

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
        className={cn(
          'kanban-card',
          (isDragging || isSorting) && 'kanban-card-dragging opacity-90'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 
            className="font-medium text-[var(--foreground)] text-sm leading-tight pr-2 cursor-pointer hover:text-[var(--primary)] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(deal);
            }}
          >
            {deal.name}
          </h3>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={handleMenuClick}
              onTouchEnd={handleMenuClick}
              className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] rounded-md -mr-1 -mt-1 transition-colors touch-manipulation"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {/* Desktop Dropdown Menu */}
            {showMenu && !isMobile && (
              <div className="absolute right-0 top-8 z-50 w-40 bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] py-1 animate-scale-in">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView?.(deal);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                >
                  <Eye className="w-4 h-4 text-[var(--muted)]" />
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(deal);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                >
                  <Pencil className="w-4 h-4 text-[var(--muted)]" />
                  Edit Deal
                </button>
                <div className="border-t border-[var(--border)] my-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--danger-light)]"
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
              <div className="w-5 h-5 rounded bg-[var(--card-hover)] flex items-center justify-center">
                <Building2 className="w-3 h-3 text-[var(--muted)]" />
              </div>
            )}
            <span className="text-xs text-[var(--muted)] truncate">{deal.company.name}</span>
          </div>
        )}

        {/* Contact */}
        {deal.contact && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-[var(--primary-light)] flex items-center justify-center">
              <span className="text-[10px] font-medium text-[var(--primary)]">
                {deal.contact.first_name[0]}{deal.contact.last_name?.[0] || ''}
              </span>
            </div>
            <span className="text-xs text-[var(--muted)] truncate">
              {deal.contact.first_name} {deal.contact.last_name}
            </span>
          </div>
        )}

        {/* Owner */}
        {deal.owner && (
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
              style={{ backgroundColor: deal.owner.color }}
            >
              {deal.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <span className="text-xs text-[var(--muted-foreground)] truncate">
              {deal.owner.name}
            </span>
          </div>
        )}

        {/* Amount & Date */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
            <DollarSign className="w-3.5 h-3.5 text-[var(--success)]" />
            {deal.amount ? formatCurrency(deal.amount) : '—'}
          </div>
          {deal.expected_close_date && (
            <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <Calendar className="w-3 h-3" />
              {formatDate(deal.expected_close_date)}
            </div>
          )}
        </div>

        {/* Priority badge & Score */}
        {((deal.priority && deal.priority !== 'medium') || (deal.lead_score && deal.lead_score > 0)) && (
          <div className="mt-2 flex items-center gap-2">
            {deal.priority && deal.priority !== 'medium' && (
              <span className={cn(
                'badge',
                priorityColors[deal.priority as keyof typeof priorityColors] || priorityColors.medium
              )}>
                {deal.priority}
              </span>
            )}
            {deal.lead_score && deal.lead_score > 0 && (
              <ScoreIndicator score={deal.lead_score} />
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet */}
      <BottomSheet
        isOpen={showMobileSheet}
        onClose={() => setShowMobileSheet(false)}
        title={deal.name}
      >
        <div className="py-2">
          {/* Deal summary */}
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                {deal.amount ? formatCurrency(deal.amount) : '—'}
              </span>
              {deal.expected_close_date && (
                <span className="text-sm text-[var(--muted)]">
                  Close: {formatDate(deal.expected_close_date)}
                </span>
              )}
            </div>
            {deal.company && (
              <p className="text-sm text-[var(--muted)]">{deal.company.name}</p>
            )}
          </div>

          {/* Quick actions */}
          {deal.contact?.email && (
            <a
              href={`mailto:${deal.contact.email}`}
              className="w-full flex items-center gap-4 px-4 py-4 text-[var(--foreground)] active:bg-[var(--card-hover)]"
            >
              <Mail className="w-5 h-5 text-[var(--muted)]" />
              <span className="font-medium">Email {deal.contact.first_name}</span>
            </a>
          )}

          <div className="border-t border-[var(--border)]" />

          {/* Main actions */}
          <BottomSheetItem
            icon={<Eye className="w-5 h-5" />}
            label="View Details"
            onClick={() => {
              setShowMobileSheet(false);
              onView?.(deal);
            }}
          />
          <BottomSheetItem
            icon={<Pencil className="w-5 h-5" />}
            label="Edit Deal"
            onClick={() => {
              setShowMobileSheet(false);
              onEdit?.(deal);
            }}
          />
          
          <div className="border-t border-[var(--border)] mt-2" />
          
          <BottomSheetItem
            icon={<Trash2 className="w-5 h-5" />}
            label="Delete Deal"
            variant="destructive"
            onClick={handleDelete}
          />
        </div>
      </BottomSheet>
    </>
  );
}
