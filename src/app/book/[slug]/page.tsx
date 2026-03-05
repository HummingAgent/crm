'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, Clock, User, Mail, Phone, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';

interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  team_member: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  available_days: number[];
  available_hours: { start: string; end: string };
  questions: { id: string; label: string; required: boolean; type: string }[];
  confirmation_message: string | null;
}

interface Slot {
  start: string;
  end: string;
  available: boolean;
}

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [link, setLink] = useState<BookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'date' | 'time' | 'form' | 'confirmed'>('date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    answers: {} as Record<string, string>,
  });
  const [booking, setBooking] = useState(false);

  // Load booking link
  useEffect(() => {
    loadLink();
  }, [slug]);

  const loadLink = async () => {
    try {
      const res = await fetch(`/api/booking?slug=${slug}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setLink(data.link);
      }
    } catch {
      setError('Failed to load booking page');
    }
    setLoading(false);
  };

  // Load slots when date selected
  useEffect(() => {
    if (selectedDate && link) {
      loadSlots();
    }
  }, [selectedDate]);

  const loadSlots = async () => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    
    try {
      const res = await fetch(`/api/booking?slug=${slug}&date=${selectedDate}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    }
    
    setLoadingSlots(false);
  };

  const handleBook = async () => {
    if (!link || !selectedSlot) return;
    setBooking(true);

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          link_id: link.id,
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
          guest_name: formData.name,
          guest_email: formData.email,
          guest_phone: formData.phone || null,
          notes: formData.notes || null,
          answers: formData.answers,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        setStep('confirmed');
      }
    } catch {
      alert('Failed to book appointment');
    }

    setBooking(false);
  };

  // Generate dates for next 30 days
  const generateDates = () => {
    const dates: { date: string; label: string; dayOfWeek: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      
      dates.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayOfWeek: d.getDay(),
      });
    }

    return dates;
  };

  const dates = generateDates();
  const availableDates = link ? dates.filter(d => link.available_days.includes(d.dayOfWeek)) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-500">{error || 'This booking link does not exist or is no longer active.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            {link.team_member?.avatar_url ? (
              <img 
                src={link.team_member.avatar_url} 
                alt={link.team_member.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{link.title}</h1>
              {link.team_member && (
                <p className="text-gray-500">{link.team_member.name}</p>
              )}
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{link.duration_minutes} minutes</span>
              </div>
            </div>
          </div>
          {link.description && (
            <p className="mt-4 text-gray-600">{link.description}</p>
          )}
        </div>

        {/* Booking Steps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {step === 'date' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Date</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableDates.slice(0, 16).map((d) => (
                  <button
                    key={d.date}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setStep('time');
                    }}
                    className="p-3 text-sm rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-center"
                  >
                    <div className="font-medium text-gray-900">{d.label.split(' ')[0]}</div>
                    <div className="text-gray-500">{d.label.split(' ').slice(1).join(' ')}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'time' && (
            <div>
              <button
                onClick={() => setStep('date')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to dates
              </button>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Select a Time — {new Date(selectedDate!).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
              
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.filter(s => s.available).map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep('form');
                      }}
                      className="p-3 text-sm font-medium rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                    >
                      {new Date(slot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </button>
                  ))}
                  {slots.filter(s => s.available).length === 0 && (
                    <p className="col-span-full text-center text-gray-500 py-4">
                      No available times on this date
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'form' && selectedSlot && (
            <div>
              <button
                onClick={() => setStep('time')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to times
              </button>
              
              <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">
                    {new Date(selectedSlot.start).toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'long', day: 'numeric' 
                    })}
                  </span>
                  <span>at</span>
                  <span className="font-medium">
                    {new Date(selectedSlot.start).toLocaleTimeString('en-US', { 
                      hour: 'numeric', minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {link.questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {q.label} {q.required && '*'}
                    </label>
                    <input
                      type="text"
                      value={formData.answers[q.id] || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        answers: { ...formData.answers, [q.id]: e.target.value } 
                      })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required={q.required}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Anything you'd like us to know?"
                  />
                </div>

                <button
                  onClick={handleBook}
                  disabled={booking || !formData.name || !formData.email}
                  className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {booking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'confirmed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're booked!</h2>
              <p className="text-gray-500 mb-4">
                A confirmation email has been sent to {formData.email}
              </p>
              {link.confirmation_message && (
                <p className="text-gray-600">{link.confirmation_message}</p>
              )}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">
                    {selectedSlot && new Date(selectedSlot.start).toLocaleDateString('en-US', { 
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-700 mt-1">
                  <Clock className="w-5 h-5" />
                  <span>
                    {selectedSlot && new Date(selectedSlot.start).toLocaleTimeString('en-US', { 
                      hour: 'numeric', minute: '2-digit'
                    })} ({link.duration_minutes} min)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Powered by HummingAgent CRM
        </div>
      </div>
    </div>
  );
}
