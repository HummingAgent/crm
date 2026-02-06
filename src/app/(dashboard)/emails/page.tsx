'use client';

import { useState } from 'react';
import { 
  Mail, 
  Calendar, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink,
  Settings,
  Sparkles
} from 'lucide-react';

export default function EmailsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [calendlyUrl, setCalendlyUrl] = useState('https://calendly.com/hummingagent');
  const [demoLinks, setDemoLinks] = useState([
    { id: '1', name: '30-min Discovery Call', url: 'https://calendly.com/hummingagent/discovery', duration: '30 min' },
    { id: '2', name: '60-min Demo', url: 'https://calendly.com/hummingagent/demo', duration: '60 min' },
    { id: '3', name: '15-min Quick Chat', url: 'https://calendly.com/hummingagent/quick-chat', duration: '15 min' },
  ]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const emailTemplates = [
    {
      id: 'intro',
      name: 'Introduction',
      subject: 'Quick intro from HummingAgent',
      preview: 'Hi {first_name}, I came across {company}...',
    },
    {
      id: 'follow-up',
      name: 'Follow Up',
      subject: 'Following up on our conversation',
      preview: 'Hi {first_name}, Just wanted to follow up...',
    },
    {
      id: 'demo-invite',
      name: 'Demo Invite',
      subject: 'See HummingAgent in action',
      preview: 'Hi {first_name}, I\'d love to show you how...',
    },
    {
      id: 'proposal',
      name: 'Proposal Follow Up',
      subject: 'Proposal for {company}',
      preview: 'Hi {first_name}, Attached is the proposal...',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email & Scheduling</h1>
        <p className="text-sm text-gray-500 mt-1">Quick links and email templates for outreach</p>
      </div>

      {/* Demo Links Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Scheduling Links</h2>
              <p className="text-sm text-gray-500">Share these links to book meetings</p>
            </div>
          </div>
          <a 
            href="https://calendly.com/event_types/user/me" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
          >
            Manage in Calendly <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-3">
          {demoLinks.map((link) => (
            <div 
              key={link.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{link.name}</p>
                  <p className="text-sm text-gray-500">{link.duration}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 max-w-[200px] truncate">
                  {link.url}
                </code>
                <button
                  onClick={() => copyToClipboard(link.url, link.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white"
                >
                  {copied === link.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-violet-600 rounded-lg hover:bg-white"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Add Custom Link */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="Your Calendly URL"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
            <button
              onClick={() => copyToClipboard(calendlyUrl, 'custom')}
              className="px-4 py-2 text-sm font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50"
            >
              {copied === 'custom' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Email Templates</h2>
              <p className="text-sm text-gray-500">Quick templates for outreach</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emailTemplates.map((template) => (
            <div 
              key={template.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {template.name}
                </span>
              </div>
              <p className="font-medium text-gray-900 text-sm mb-1">{template.subject}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{template.preview}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            <Sparkles className="w-4 h-4 inline mr-1" />
            AI-powered email sequences coming soon
          </p>
        </div>
      </div>

      {/* Email Integration Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Email Integration</h2>
            <p className="text-sm text-gray-500">Connect your email to track conversations</p>
          </div>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
          <p className="text-sm text-orange-800">
            📧 Gmail integration coming soon. This will automatically track emails with contacts and log them to deals.
          </p>
        </div>
      </div>
    </div>
  );
}
