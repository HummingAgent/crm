'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Loader2, 
  Calendar,
  Clock,
  Link2,
  Copy,
  Check,
  Trash2,
  Edit2,
  ExternalLink,
  User,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  team_member_id: string | null;
  is_active: boolean;
  available_days: number[];
  available_hours: { start: string; end: string };
  min_notice_hours: number;
  max_days_ahead: number;
  team_member?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export function BookingLinksManager() {
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [linksRes, teamRes] = await Promise.all([
        fetch('/api/booking'),
        fetch('/api/team'),
      ]);
      
      const linksData = await linksRes.json();
      const teamData = await teamRes.json();
      
      setLinks(linksData.links || []);
      setTeamMembers(teamData.members || []);
    } catch (err) {
      console.error('Failed to load booking links:', err);
    }
    setLoading(false);
  };

  const copyLink = async (slug: string, id: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleActive = async (link: BookingLink) => {
    // This would need an API endpoint to update the link
    // For now, just update locally
    setLinks(prev => prev.map(l => 
      l.id === link.id ? { ...l, is_active: !l.is_active } : l
    ));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Booking Links</h3>
          <p className="text-sm text-[var(--muted)]">
            Create scheduling links for clients to book meetings
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Link
        </button>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-[var(--muted)] opacity-50" />
          <h4 className="font-medium text-[var(--foreground)] mb-1">No booking links yet</h4>
          <p className="text-sm text-[var(--muted)] mb-4">
            Create a booking link to let clients schedule meetings with you
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary-light)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first booking link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div
              key={link.id}
              className={cn(
                'border rounded-xl p-5 transition-all',
                link.is_active 
                  ? 'border-[var(--border)] bg-[var(--card)]' 
                  : 'border-dashed border-[var(--border)] bg-[var(--card-hover)] opacity-75'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)]">{link.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{link.duration_minutes} minutes</span>
                        {link.team_member && (
                          <>
                            <span>•</span>
                            <User className="w-3.5 h-3.5" />
                            <span>{link.team_member.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {link.description && (
                    <p className="text-sm text-[var(--muted)] mb-3">{link.description}</p>
                  )}

                  {/* Availability Summary */}
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Days:</span>
                      {link.available_days.map(d => dayNames[d]).join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Hours:</span>
                      {link.available_hours.start} - {link.available_hours.end}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Notice:</span>
                      {link.min_notice_hours}h minimum
                    </span>
                  </div>

                  {/* Link URL */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-[var(--card-hover)] rounded-lg text-sm text-[var(--muted)] font-mono">
                      <Link2 className="w-3.5 h-3.5" />
                      /book/{link.slug}
                    </div>
                    <button
                      onClick={() => copyLink(link.slug, link.id)}
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                      title="Copy link"
                    >
                      {copiedId === link.id ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`/book/${link.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                      title="Open link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(link)}
                    className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--card-hover)] transition-colors"
                    title={link.is_active ? 'Disable' : 'Enable'}
                  >
                    {link.is_active ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingLink(link)}
                    className="p-2 text-[var(--muted)] hover:text-[var(--primary)] rounded-lg hover:bg-[var(--primary-light)] transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this booking link?')) {
                        setLinks(prev => prev.filter(l => l.id !== link.id));
                      }
                    }}
                    className="p-2 text-[var(--muted)] hover:text-[var(--danger)] rounded-lg hover:bg-[var(--danger-light)] transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editingLink) && (
        <BookingLinkForm
          link={editingLink}
          teamMembers={teamMembers}
          onClose={() => {
            setShowCreate(false);
            setEditingLink(null);
          }}
          onSaved={(savedLink) => {
            if (editingLink) {
              setLinks(prev => prev.map(l => l.id === savedLink.id ? savedLink : l));
            } else {
              setLinks(prev => [savedLink, ...prev]);
            }
            setShowCreate(false);
            setEditingLink(null);
          }}
        />
      )}
    </div>
  );
}

// Create/Edit Form
function BookingLinkForm({
  link,
  teamMembers,
  onClose,
  onSaved,
}: {
  link: BookingLink | null;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSaved: (link: BookingLink) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    slug: link?.slug || '',
    title: link?.title || '',
    description: link?.description || '',
    duration_minutes: link?.duration_minutes || 30,
    team_member_id: link?.team_member_id || '',
    available_days: link?.available_days || [1, 2, 3, 4, 5],
    available_hours: link?.available_hours || { start: '09:00', end: '17:00' },
    min_notice_hours: link?.min_notice_hours || 24,
    max_days_ahead: link?.max_days_ahead || 60,
  });

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      alert('Slug and title are required');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_link',
          ...formData,
          team_member_id: formData.team_member_id || null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        onSaved(data.link);
      }
    } catch (err) {
      alert('Failed to save booking link');
    }

    setSaving(false);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day].sort(),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[var(--card)] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {link ? 'Edit Booking Link' : 'New Booking Link'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] rounded-lg"
          >
            <span className="sr-only">Close</span>✕
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              URL Slug *
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 text-sm text-[var(--muted)] bg-[var(--card-hover)] border border-r-0 border-[var(--border)] rounded-l-lg">
                /book/
              </span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="intro-call"
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-r-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="30 Minute Introduction Call"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Let's chat about how we can help..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {/* Duration & Team Member */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Duration
              </label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Team Member
              </label>
              <select
                value={formData.team_member_id}
                onChange={(e) => setFormData(prev => ({ ...prev, team_member_id: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value="">Anyone</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Available Days */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Available Days
            </label>
            <div className="flex gap-2">
              {dayNames.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-lg transition-colors',
                    formData.available_days.includes(i)
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--card-hover)] text-[var(--muted)] hover:bg-[var(--border)]'
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Available Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                value={formData.available_hours.start}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  available_hours: { ...prev.available_hours, start: e.target.value } 
                }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                End Time
              </label>
              <input
                type="time"
                value={formData.available_hours.end}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  available_hours: { ...prev.available_hours, end: e.target.value } 
                }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>

          {/* Notice & Ahead */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Minimum Notice
              </label>
              <select
                value={formData.min_notice_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, min_notice_hours: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                Book Ahead (days)
              </label>
              <select
                value={formData.max_days_ahead}
                onChange={(e) => setFormData(prev => ({ ...prev, max_days_ahead: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.slug || !formData.title}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving...' : link ? 'Save Changes' : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
