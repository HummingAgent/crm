'use client';

import { useState } from 'react';
import { Calendar, Phone, Mail, Video, Presentation, X, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ScheduleNextActionProps {
  dealId: string;
  dealName: string;
  currentAction?: string | null;
  currentDate?: string | null;
  currentType?: string | null;
  onSaved?: () => void;
  onClose?: () => void;
  compact?: boolean;
}

const ACTION_TYPES = [
  { value: 'call', label: 'Call', icon: Phone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'email', label: 'Email', icon: Mail, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'meeting', label: 'Meeting', icon: Video, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { value: 'demo', label: 'Demo', icon: Presentation, color: 'text-orange-600 bg-orange-50 border-orange-200' },
];

export function ScheduleNextAction({
  dealId,
  dealName,
  currentAction,
  currentDate,
  currentType,
  onSaved,
  onClose,
  compact = false,
}: ScheduleNextActionProps) {
  const [actionType, setActionType] = useState(currentType || 'call');
  const [actionDate, setActionDate] = useState(currentDate?.split('T')[0] || '');
  const [actionNotes, setActionNotes] = useState(currentAction || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!actionDate) return;
    setSaving(true);

    const supabase = createClient();
    
    const { error } = await supabase
      .from('crm_deals')
      .update({
        next_action: actionNotes || `${actionType} follow-up`,
        next_action_date: actionDate,
        next_action_type: actionType,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', dealId);

    if (!error) {
      // Log activity
      await supabase.from('crm_activities').insert({
        deal_id: dealId,
        type: 'note',
        subject: `Next action scheduled: ${actionType}`,
        body: `${actionNotes || actionType} on ${actionDate}`,
      });
    }

    setSaving(false);
    onSaved?.();
  };

  const handleClear = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('crm_deals')
      .update({ next_action: null, next_action_date: null, next_action_type: null })
      .eq('id', dealId);
    setSaving(false);
    onSaved?.();
  };

  if (compact) {
    return (
      <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-violet-700">📅 Schedule Next Action</span>
          {onClose && (
            <button onClick={onClose} className="p-1 text-violet-400 hover:text-violet-600 rounded">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Type Buttons */}
        <div className="flex gap-1.5">
          {ACTION_TYPES.map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => setActionType(value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                actionType === value ? color : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Date + Notes */}
        <div className="flex gap-2">
          <input
            type="date"
            value={actionDate}
            onChange={(e) => setActionDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="flex-shrink-0 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
          <input
            type="text"
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder="Notes..."
            className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!actionDate || saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
          {(currentAction || currentDate) && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full dialog version
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Schedule Next Action</h3>
        {onClose && (
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Action Type */}
      <div className="grid grid-cols-4 gap-2">
        {ACTION_TYPES.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => setActionType(value)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              actionType === value ? color : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={actionDate}
            onChange={(e) => setActionDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={actionNotes}
          onChange={(e) => setActionNotes(e.target.value)}
          placeholder={`${actionType} follow-up notes...`}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!actionDate || saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Schedule Action
        </button>
        {(currentAction || currentDate) && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
