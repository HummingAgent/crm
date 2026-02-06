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
  Loader2
} from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = async () => {
    setSaving(true);
    // In a real app, save to database or env
    // For now, just simulate saving
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
