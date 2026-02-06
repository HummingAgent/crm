'use client';

import { useEffect, useState } from 'react';
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
  MoreHorizontal
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NewMeetingDialog } from '@/components/crm/new-meeting-dialog';

interface Meeting {
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

export default function CalendarPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('week');
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadMeetings();
  }, [currentDate]);

  const loadMeetings = async () => {
    const supabase = createClient();
    
    // Get meetings for the current month range
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('crm_activities')
      .select(`
        *,
        deal:crm_deals(id, name, amount),
        contact:crm_contacts(id, first_name, last_name),
        company:crm_companies(id, name)
      `)
      .eq('type', 'meeting')
      .gte('meeting_start', startOfMonth.toISOString())
      .lte('meeting_start', endOfMonth.toISOString())
      .order('meeting_start', { ascending: true });

    if (data) setMeetings(data);
    setLoading(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get days for the current week view
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter(m => {
      const meetingDate = new Date(m.meeting_start);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const getMeetingIcon = (meeting: Meeting) => {
    if (meeting.meeting_location?.includes('zoom') || meeting.meeting_location?.includes('meet')) {
      return Video;
    }
    if (meeting.meeting_location?.includes('phone') || meeting.meeting_location?.includes('call')) {
      return Phone;
    }
    return Clock;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.32))]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium text-gray-900 min-w-[180px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth('next')}
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
        </div>
        <button 
          onClick={() => setShowNewMeeting(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Log Meeting
        </button>
      </div>

      {/* Week View */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day, i) => (
            <div 
              key={i} 
              className={`px-4 py-3 text-center border-r border-gray-100 last:border-r-0 ${
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

        {/* Day Content */}
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day, i) => {
            const dayMeetings = getMeetingsForDay(day);
            return (
              <div 
                key={i}
                className={`border-r border-gray-100 last:border-r-0 p-2 ${
                  isToday(day) ? 'bg-violet-50/30' : ''
                }`}
              >
                {dayMeetings.length === 0 ? (
                  <button
                    onClick={() => {
                      setSelectedDate(day);
                      setShowNewMeeting(true);
                    }}
                    className="w-full h-full min-h-[100px] flex items-center justify-center text-gray-300 hover:text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    {dayMeetings.map((meeting) => {
                      const Icon = getMeetingIcon(meeting);
                      return (
                        <div
                          key={meeting.id}
                          className="p-2 bg-violet-100 border border-violet-200 rounded-lg cursor-pointer hover:bg-violet-150 transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <Icon className="w-3.5 h-3.5 text-violet-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-violet-900 truncate">
                                {meeting.subject || 'Meeting'}
                              </p>
                              <p className="text-xs text-violet-600">
                                {formatTime(meeting.meeting_start)}
                              </p>
                              {meeting.contact && (
                                <p className="text-xs text-violet-700 truncate mt-1">
                                  {meeting.contact.first_name} {meeting.contact.last_name}
                                </p>
                              )}
                              {meeting.deal && (
                                <p className="text-xs text-violet-600 truncate flex items-center gap-1 mt-0.5">
                                  <DollarSign className="w-3 h-3" />
                                  {meeting.deal.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => {
                        setSelectedDate(day);
                        setShowNewMeeting(true);
                      }}
                      className="w-full py-1 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Meetings Sidebar */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upcoming Meetings</h2>
        {meetings.filter(m => new Date(m.meeting_start) >= new Date()).length > 0 ? (
          <div className="space-y-3">
            {meetings
              .filter(m => new Date(m.meeting_start) >= new Date())
              .slice(0, 5)
              .map((meeting) => {
                const Icon = getMeetingIcon(meeting);
                return (
                  <div key={meeting.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{meeting.subject || 'Meeting'}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(meeting.meeting_start).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} at {formatTime(meeting.meeting_start)}
                      </p>
                      {meeting.contact && (
                        <p className="text-sm text-gray-600 mt-1">
                          with {meeting.contact.first_name} {meeting.contact.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No upcoming meetings</p>
        )}
      </div>

      {/* New Meeting Dialog */}
      {showNewMeeting && (
        <NewMeetingDialog
          defaultDate={selectedDate}
          onClose={() => {
            setShowNewMeeting(false);
            setSelectedDate(null);
          }}
          onCreated={(newMeeting) => {
            setMeetings(prev => [...prev, newMeeting].sort((a, b) => 
              new Date(a.meeting_start).getTime() - new Date(b.meeting_start).getTime()
            ));
            setShowNewMeeting(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}
