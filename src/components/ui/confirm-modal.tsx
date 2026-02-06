'use client';

import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onCancel}>
      <div 
        className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-zinc-600">{message}</p>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
