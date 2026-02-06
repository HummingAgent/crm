'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

export function Tooltip({ 
  content, 
  children, 
  className,
  side = 'top',
  maxWidth = '300px'
}: TooltipProps) {
  const [show, setShow] = React.useState(false);
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && content && (
        <div 
          className={cn(
            'absolute z-50 px-3 py-2 text-xs text-white bg-zinc-900 rounded-lg shadow-lg border border-zinc-700',
            'whitespace-pre-wrap break-words',
            positionClasses[side],
            className
          )}
          style={{ maxWidth }}
        >
          {content}
          {/* Arrow */}
          <div 
            className={cn(
              'absolute w-2 h-2 bg-zinc-900 border-zinc-700 rotate-45',
              side === 'top' && 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-r border-b',
              side === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-l border-t',
              side === 'left' && 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-t border-r',
              side === 'right' && 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-b border-l',
            )}
          />
        </div>
      )}
    </div>
  );
}
