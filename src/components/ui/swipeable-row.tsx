'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  className?: string;
  threshold?: number;
}

export function SwipeableRow({ 
  children, 
  leftActions = [], 
  rightActions = [],
  className,
  threshold = 80
}: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [translateX, setTranslateX] = useState(0);

  const maxLeftSwipe = leftActions.length * 72;
  const maxRightSwipe = rightActions.length * 72;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const x = e.touches[0].clientX;
    setCurrentX(x);
    
    let diff = x - startX + translateX;
    
    // Limit swipe distance with resistance at the edges
    if (diff > 0) {
      // Swiping right (reveal left actions)
      if (leftActions.length === 0) {
        diff = diff * 0.2; // Resistance when no left actions
      } else {
        diff = Math.min(diff, maxLeftSwipe);
      }
    } else {
      // Swiping left (reveal right actions)
      if (rightActions.length === 0) {
        diff = diff * 0.2; // Resistance when no right actions
      } else {
        diff = Math.max(diff, -maxRightSwipe);
      }
    }
    
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    const diff = currentX - startX + translateX;
    
    let finalTranslate = 0;
    
    if (diff > threshold && leftActions.length > 0) {
      // Snap to show left actions
      finalTranslate = maxLeftSwipe;
    } else if (diff < -threshold && rightActions.length > 0) {
      // Snap to show right actions
      finalTranslate = -maxRightSwipe;
    }
    
    setTranslateX(finalTranslate);
    
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.2s ease-out';
      containerRef.current.style.transform = `translateX(${finalTranslate}px)`;
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = '';
        }
      }, 200);
    }
  };

  const closeSwipe = () => {
    setTranslateX(0);
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.2s ease-out';
      containerRef.current.style.transform = 'translateX(0)';
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = '';
        }
      }, 200);
    }
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    closeSwipe();
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.parentElement?.contains(e.target as Node)) {
        closeSwipe();
      }
    };
    
    if (translateX !== 0) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [translateX]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left actions (revealed when swiping right) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleActionClick(action)}
              className={cn(
                'w-[72px] flex flex-col items-center justify-center gap-1',
                action.bgColor
              )}
            >
              <span className={action.color}>{action.icon}</span>
              <span className={cn('text-xs font-medium', action.color)}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (revealed when swiping left) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleActionClick(action)}
              className={cn(
                'w-[72px] flex flex-col items-center justify-center gap-1',
                action.bgColor
              )}
            >
              <span className={action.color}>{action.icon}</span>
              <span className={cn('text-xs font-medium', action.color)}>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-white touch-pan-y"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
