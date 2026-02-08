'use client';

import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface ComposeEmailDialogProps {
  to?: string;
  toName?: string;
  dealId?: string;
  contactId?: string;
  onClose: () => void;
  onSent?: () => void;
}

export function ComposeEmailDialog({
  to = '',
  toName = '',
  dealId,
  contactId,
  onClose,
  onSent,
}: ComposeEmailDialogProps) {
  const [email, setEmail] = useState(to);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email || !subject || !body) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          body,
          deal_id: dealId,
          contact_id: contactId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      onSent?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Compose Email</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
            {toName && (
              <p className="text-sm text-gray-500 mt-1">{toName}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !email || !subject || !body}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
