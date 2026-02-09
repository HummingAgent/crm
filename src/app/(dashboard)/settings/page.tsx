'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Bell, 
  Slack,
  Save,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  Clock,
  Send,
  Timer
} from 'lucide-react';

const DEFAULT_STALE_THRESHOLDS: Record<string, number> = {
  'new-lead': 2,
  'discovery-scheduled': 3,
  'discovery-complete': 5,
  'proposal-draft': 3,
  'proposal-sent': 3,
  'contract-sent': 5,
};

const STAGE_LABELS: Record<string, string> = {
  'new-lead': 'New Lead',
  'discovery-scheduled': 'Discovery Scheduled',
  'discovery-complete': 'Discovery Complete',
  'proposal-draft': 'Proposal Draft',
  'proposal-sent': 'Proposal Sent',
  'contract-sent': 'Contract Sent',
};

export default function SettingsPage() {
  const [slackWebhook, setSlackWebhook] = useState('');
  const [notifications, setNotifications] = useState({
    dealCreated: true,
    dealStageChange: true,
    dealWon: true,
    dealLost: true,
    contactCreated: false,
    companyCreated: false,
  });
  const [staleThresholds, setStaleThresholds] = useState<Record<string, number>>(DEFAULT_STALE_THRESHOLDS);
  const [digestTime, setDigestTime] = useState('09:00');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const { settings } = await res.json();
        if (settings.slack_webhook_url) setSlackWebhook(settings.slack_webhook_url);
        if (settings.stale_thresholds) setStaleThresholds(settings.stale_thresholds);
        if (settings.digest_time) setDigestTime(settings.digest_time);
      }
    } catch (e) {
      // Use defaults
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'slack_webhook_url', value: slackWebhook }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'stale_thresholds', value: staleThresholds }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'digest_time', value: digestTime }),
        }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const handleTestSlack = async () => {
    if (!slackWebhook) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🎉 HummingAgent CRM connected successfully!',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Test notification from HummingAgent CRM*\n\nYour Slack integration is working correctly!',
              },
            },
          ],
        }),
      });
      setTestResult(response.ok ? 'success' : 'error');
    } catch (error) {
      setTestResult('error');
    }
    setTesting(false);
  };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    setDigestResult(null);
    try {
      const res = await fetch('/api/digest', { method: 'POST' });
      setDigestResult(res.ok ? 'success' : 'error');
    } catch {
      setDigestResult('error');
    }
    setSendingDigest(false);
    setTimeout(() => setDigestResult(null), 3000);
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your CRM preferences</p>
      </div>

      {/* Slack Integration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
            <Slack className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Slack Integration</h2>
            <p className="text-sm text-gray-500">Get notified about deal updates in Slack</p>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
            <button
              onClick={handleTestSlack}
              disabled={!slackWebhook || testing}
              className="px-4 py-2 text-sm font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : testResult === 'success' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : testResult === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : null}
              Test
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Create an incoming webhook in your Slack workspace.{' '}
            <a 
              href="https://api.slack.com/messaging/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline inline-flex items-center gap-1"
            >
              Learn how <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Notification Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Notify me when...
          </label>
          <div className="space-y-3">
            {[
              { key: 'dealCreated', label: 'New deal is created', emoji: '🆕' },
              { key: 'dealStageChange', label: 'Deal moves to a new stage', emoji: '➡️' },
              { key: 'dealWon', label: 'Deal is won', emoji: '🎉' },
              { key: 'dealLost', label: 'Deal is lost', emoji: '😔' },
              { key: 'contactCreated', label: 'New contact is added', emoji: '👤' },
              { key: 'companyCreated', label: 'New company is added', emoji: '🏢' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[item.key as keyof typeof notifications]}
                  onChange={(e) => setNotifications(prev => ({ 
                    ...prev, 
                    [item.key]: e.target.checked 
                  }))}
                  className="w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700">
                  {item.emoji} {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Digest Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Timer className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Daily Digest</h2>
            <p className="text-sm text-gray-500">Get a daily summary of stale deals and pending actions</p>
          </div>
        </div>

        {/* Digest Time */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Digest Time (UTC)
          </label>
          <input
            type="time"
            value={digestTime}
            onChange={(e) => setDigestTime(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Configure via Vercel cron or external scheduler to call <code className="bg-gray-100 px-1 rounded">/api/cron/digest</code>
          </p>
        </div>

        {/* Stale Thresholds */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Stale Deal Thresholds (days without activity)
          </label>
          <div className="space-y-3">
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={staleThresholds[key] || DEFAULT_STALE_THRESHOLDS[key]}
                    onChange={(e) => setStaleThresholds(prev => ({
                      ...prev,
                      [key]: parseInt(e.target.value) || 1,
                    }))}
                    className="w-16 px-2 py-1.5 text-center border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                  <span className="text-xs text-gray-500">days</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Send Digest Now */}
        <button
          onClick={handleSendDigest}
          disabled={sendingDigest}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
        >
          {sendingDigest ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : digestResult === 'success' ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : digestResult === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {digestResult === 'success' ? 'Digest Sent!' : digestResult === 'error' ? 'Failed' : 'Send Digest Now'}
        </button>
      </div>

      {/* Pipeline Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Pipeline Settings</h2>
            <p className="text-sm text-gray-500">Customize your sales pipeline stages</p>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Pipeline customization coming soon. Currently using default stages.
        </p>
      </div>

      {/* Slack Slash Commands Setup */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Slack className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Slack Slash Commands</h2>
            <p className="text-sm text-gray-500">Quick CRM updates from Slack</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <p className="font-medium text-gray-800">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">api.slack.com/apps</a> and create a new app</li>
            <li>Under &quot;Slash Commands&quot;, create a new command: <code className="bg-gray-100 px-1 rounded">/crm</code></li>
            <li>Set the Request URL to: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">https://crm.hummingagent.ai/api/slack/command</code></li>
            <li>Install the app to your workspace</li>
          </ol>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-800 mb-2">Available Commands:</p>
            <div className="space-y-1 font-mono text-xs">
              <p><code>/crm add &lt;name&gt; &lt;company&gt;</code> — Quick-add a contact</p>
              <p><code>/crm deal &lt;name&gt; &lt;stage&gt;</code> — Create or update a deal</p>
              <p><code>/crm log &lt;deal&gt; &lt;note&gt;</code> — Add an activity note</p>
              <p><code>/crm status</code> — Pipeline summary</p>
              <p><code>/crm digest</code> — Trigger daily digest</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
