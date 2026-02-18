'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Building2,
  DollarSign,
  Calendar as CalendarIcon,
  Link2,
  Link2Off,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NewMeetingDialog } from '@/components/crm/new-meeting-dialog';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  color: string;
  role: string;
  isConnected: boolean;
  connection: {
    id: string;
    google_email: string;
    sync_enabled: boolean;
    last_synced_at: string | null;
    sync_error: string | null;
  } | null;
}

interface CalendarEvent {
  id: string;
  googleEventId: string;
  teamMemberId: string;
  teamMemberName: string;
  teamMemberColor: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  allDay: boolean;
  attendees: Array<{ email: string; displayName?: string }> | null;
  hangoutLink: string | null;
}

interface CRMMeeting {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  meeting_start: string;
  meeting_end: string | null;
  meeting_location: string | null;
  meeting_attendees: string[] | null;
  deal_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal?: { id: string; name: string; amount: number | null };
  contact?: { id: string; first_name: string; last_name: string | null };
  company?: { id: string; name: string };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [visibleMembers, setVisibleMembers] = useState<Set<string>>(new Set());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [crmMeetings, setCrmMeetings] = useState<CRMMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day'>('week');
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Load team members
  useEffect(() => {
    loadTeam();
    
    // Check for connection callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      loadTeam();
      // Clear the URL param
      window.history.replaceState({}, '', '/calendar');
    }
  }, []);

  // Load events when team or date changes
  useEffect(() => {
    if (team.length > 0) {
      loadEvents();
    }
  }, [currentDate, team, visibleMembers]);

  const loadTeam = async () => {
    try {
      const res = await fetch('/api/calendar/team');
      const data = await res.json();
      if (data.team) {
        setTeam(data.team);
        // Initially show all members
        setVisibleMembers(new Set(data.team.map((m: TeamMember) => m.id)));
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    }
    setLoading(false);
  };

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    
    // Calculate date range based on view
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const connectedMemberIds = team
      .filter(m => m.isConnected && visibleMembers.has(m.id))
      .map(m => m.id);

    // Fetch Google Calendar events
    if (connectedMemberIds.length > 0) {
      try {
        const res = await fetch(
          `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}&teamMemberIds=${connectedMemberIds.join(',')}`
        );
        const data = await res.json();
        if (data.events) {
          setCalendarEvents(data.events);
        }
      } catch (err) {
        console.error('Failed to load calendar events:', err);
      }
    } else {
      setCalendarEvents([]);
    }

    // Also load CRM meetings
    const supabase = createClient();
    const { data: meetings } = await supabase
      .from('crm_activities')
      .select(`
        *,
        deal:crm_deals(id, name, amount),
        contact:crm_contacts(id, first_name, last_name),
        company:crm_companies(id, name)
      `)
      .eq('type', 'meeting')
      .gte('meeting_start', start.toISOString())
      .lte('meeting_start', end.toISOString())
      .order('meeting_start', { ascending: true });

    if (meetings) setCrmMeetings(meetings);
    setEventsLoading(false);
  }, [currentDate, team, visibleMembers]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  const weekDays = getWeekDays();
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    const dayStart = new Date(date);
    dayStart.setHours(hour, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(hour, 59, 59, 999);

    return calendarEvents.filter(event => {
      if (!visibleMembers.has(event.teamMemberId)) return false;
      const start = new Date(event.startTime);
      return start >= dayStart && start <= dayEnd;
    });
  };

  const getAllDayEvents = (date: Date) => {
    return calendarEvents.filter(event => {
      if (!visibleMembers.has(event.teamMemberId)) return false;
      if (!event.allDay) return false;
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const toggleMemberVisibility = (memberId: string) => {
    setVisibleMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const connectCalendar = (memberId: string) => {
    window.location.href = `/api/calendar/auth?teamMemberId=${memberId}`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.24))] flex gap-6">
      {/* Team Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Calendars
            </h2>
          </div>
          
          <div className="space-y-2">
            {team.map(member => (
              <div 
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
              >
                {/* Color indicator / visibility toggle */}
                <button
                  onClick={() => toggleMemberVisibility(member.id)}
                  className="relative"
                  title={visibleMembers.has(member.id) ? 'Hide calendar' : 'Show calendar'}
                >
                  <div 
                    className={`w-4 h-4 rounded-full transition-opacity ${
                      visibleMembers.has(member.id) ? 'opacity-100' : 'opacity-30'
                    }`}
                    style={{ backgroundColor: member.color }}
                  />
                  {visibleMembers.has(member.id) && (
                    <Check className="absolute -top-0.5 -right-0.5 w-3 h-3 text-white bg-gray-800 rounded-full p-0.5" />
                  )}
                </button>
                
                {/* Member info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                </div>
                
                {/* Connection status */}
                {member.isConnected ? (
                  <div className="flex items-center gap-1 text-green-600" title="Calendar connected">
                    <Link2 className="w-4 h-4" />
                  </div>
                ) : (
                  <button
                    onClick={() => connectCalendar(member.id)}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                    title="Connect Google Calendar"
                  >
                    <Link2Off className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {team.filter(m => !m.isConnected).length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium">Some calendars not connected</p>
                  <p className="mt-1">Click the link icon to connect Google Calendar</p>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">Legend</p>
            <div className="space-y-1">
              {team.filter(m => visibleMembers.has(m.id)).map(member => (
                <div key={member.id} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="text-gray-600">{member.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium text-gray-900 min-w-[180px] text-center">
                {MONTHS[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            {eventsLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600" />
            )}
          </div>
          <button 
            onClick={() => setShowNewMeeting(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Log Meeting
          </button>
        </div>

        {/* Week Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="px-2 py-3 text-center text-xs text-gray-400 border-r border-gray-100">
              {/* Time column header */}
            </div>
            {weekDays.map((day, i) => (
              <div 
                key={i} 
                className={`px-2 py-3 text-center border-r border-gray-100 last:border-r-0 ${
                  isToday(day) ? 'bg-violet-50' : ''
                }`}
              >
                <p className="text-xs text-gray-500 uppercase">{DAYS[day.getDay()]}</p>
                <p className={`text-lg font-semibold mt-1 ${
                  isToday(day) ? 'text-violet-600' : 'text-gray-900'
                }`}>
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* All-day events row */}
          {weekDays.some(day => getAllDayEvents(day).length > 0) && (
            <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
              <div className="px-2 py-1 text-xs text-gray-400 border-r border-gray-100 flex items-center justify-end pr-3">
                All day
              </div>
              {weekDays.map((day, i) => {
                const allDayEvents = getAllDayEvents(day);
                return (
                  <div key={i} className="px-1 py-1 border-r border-gray-100 last:border-r-0 min-h-[40px]">
                    {allDayEvents.map(event => (
                      <div
                        key={event.id}
                        className="text-xs px-2 py-1 rounded mb-1 truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: event.teamMemberColor + '30', color: event.teamMemberColor }}
                        onClick={() => setSelectedEvent(event)}
                        title={`${event.title} - ${event.teamMemberName}`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Time grid */}
          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.slice(7, 21).map(hour => ( // Show 7 AM to 9 PM
              <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
                {/* Time label */}
                <div className="px-2 py-1 text-xs text-gray-400 border-r border-gray-100 text-right pr-3">
                  {formatHour(hour)}
                </div>
                
                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const events = getEventsForDayAndHour(day, hour);
                  return (
                    <div 
                      key={dayIndex}
                      className={`px-1 py-1 border-r border-gray-100 last:border-r-0 relative ${
                        isToday(day) ? 'bg-violet-50/30' : ''
                      }`}
                    >
                      {events.map(event => (
                        <div
                          key={event.id}
                          className="text-xs px-2 py-1 rounded mb-1 cursor-pointer hover:opacity-80 border-l-2"
                          style={{ 
                            backgroundColor: event.teamMemberColor + '15',
                            borderColor: event.teamMemberColor,
                          }}
                          onClick={() => setSelectedEvent(event)}
                          title={`${event.title} - ${event.teamMemberName}`}
                        >
                          <p className="font-medium truncate" style={{ color: event.teamMemberColor }}>
                            {event.title}
                          </p>
                          <p className="text-gray-500">{formatTime(event.startTime)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event Detail Popover */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div 
              className="h-2"
              style={{ backgroundColor: selectedEvent.teamMemberColor }}
            />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-500">{selectedEvent.teamMemberName}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {new Date(selectedEvent.startTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {!selectedEvent.allDay && (
                      <> at {formatTime(selectedEvent.startTime)}
                      {selectedEvent.endTime && <> - {formatTime(selectedEvent.endTime)}</>}
                      </>
                    )}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.hangoutLink && (
                  <div className="flex items-center gap-3 text-sm">
                    <Video className="w-4 h-4 text-gray-400" />
                    <a 
                      href={selectedEvent.hangoutLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 hover:text-violet-700 flex items-center gap-1"
                    >
                      Join video call
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <Users className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      {selectedEvent.attendees.slice(0, 5).map((a, i) => (
                        <div key={i}>{a.displayName || a.email}</div>
                      ))}
                      {selectedEvent.attendees.length > 5 && (
                        <div className="text-gray-400">+{selectedEvent.attendees.length - 5} more</div>
                      )}
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Dialog */}
      {showNewMeeting && (
        <NewMeetingDialog
          defaultDate={selectedDate}
          onClose={() => {
            setShowNewMeeting(false);
            setSelectedDate(null);
          }}
          onCreated={() => {
            loadEvents();
            setShowNewMeeting(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}
