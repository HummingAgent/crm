'use client';

import * as React from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  avatar?: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter(o => selected.includes(o.value));

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Selected values / trigger */}
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          'min-h-[42px] px-3 py-2 bg-white border border-zinc-300 rounded-md cursor-pointer',
          'flex flex-wrap items-center gap-1.5',
          'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent',
          'transition-colors hover:border-zinc-400'
        )}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-zinc-400 text-sm">{placeholder}</span>
        ) : (
          selectedOptions.map(option => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
            >
              {option.label}
              <button
                onClick={(e) => removeOption(option.value, e)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={cn(
          'ml-auto w-4 h-4 text-zinc-400 transition-transform',
          open && 'rotate-180'
        )} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-400">No options</div>
          ) : (
            options.map(option => (
              <div
                key={option.value}
                onClick={() => toggleOption(option.value)}
                className={cn(
                  'px-3 py-2 cursor-pointer flex items-center gap-2 text-sm',
                  'hover:bg-zinc-50 transition-colors',
                  selected.includes(option.value) && 'bg-blue-50'
                )}
              >
                <div className={cn(
                  'w-4 h-4 border rounded flex items-center justify-center',
                  selected.includes(option.value)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-zinc-300'
                )}>
                  {selected.includes(option.value) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                {option.avatar && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                    {option.avatar}
                  </div>
                )}
                <span className={cn(
                  selected.includes(option.value) ? 'text-blue-700 font-medium' : 'text-zinc-700'
                )}>
                  {option.label}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
