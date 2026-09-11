import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarDays, MapPin, Plus, Trash2, Users, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  registerForEvent,
  unregisterFromEvent,
} from '@/lib/eventsApi';
import type { EventType, HogEvent } from '@/types/hog';

const TYPE_LABELS: Record<EventType, string> = {
  seminar: 'Seminar',
  class: 'Class',
  other: 'Event',
};

export default function EventsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canCreate = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const [events, setEvents] = useState<HogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    fetchEvents({ upcoming_only: true })
      .then((res) => setEvents(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRegisterToggle = async (event: HogEvent) => {
    setBusyId(event.id);
    try {
      const updated = event.is_registered ? await unregisterFromEvent(event.id) : await registerForEvent(event.id);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
      toast.success(event.is_registered ? 'Registration cancelled.' : 'You are registered!');
    } catch {
      toast.error('Could not update your registration.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      toast.error('Could not delete that event.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Events & Seminars</h1>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="btn-primary px-3 py-1.5 text-xs">
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      </div>

      {showForm && (
        <EventForm
          onClose={() => setShowForm(false)}
          onCreated={(event) => {
            setEvents((prev) => [...prev, event].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
            setShowForm(false);
          }}
        />
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-800">
          <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming events.</p>
        </div>
      )}

      <div className="space-y-3">
        {events.map((event) => {
          const start = new Date(event.starts_at);
          const canManage = currentUser?.id === event.creator.id || currentUser?.role === 'admin';

          return (
            <div key={event.id} className="card flex gap-4 px-5 py-4">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-300">
                <span className="text-xs font-semibold uppercase">
                  {start.toLocaleDateString(undefined, { month: 'short' })}
                </span>
                <span className="text-lg font-bold leading-none">{start.getDate()}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded-full bg-secondary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
                      {TYPE_LABELS[event.event_type]}
                    </span>
                    <h3 className="mt-1 font-semibold text-gray-900 dark:text-gray-50">{event.title}</h3>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {event.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{event.description}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {start.toLocaleString(undefined, {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.location}
                    </span>
                  )}
                  {event.requires_registration && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {event.registration_count}
                      {event.capacity ? `/${event.capacity}` : ''} registered
                    </span>
                  )}
                </div>

                {event.requires_registration && (
                  <button
                    onClick={() => handleRegisterToggle(event)}
                    disabled={busyId === event.id || (!event.is_registered && event.is_full)}
                    className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      event.is_registered
                        ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30'
                        : 'bg-primary text-white hover:bg-primary-600'
                    }`}
                  >
                    {event.is_registered
                      ? 'Cancel registration'
                      : event.is_full
                        ? 'Full'
                        : 'Register'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (event: HogEvent) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<EventType>('other');
  const [startsAt, setStartsAt] = useState('');
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !startsAt) {
      toast.error('Add a title and start time.');
      return;
    }
    setSubmitting(true);
    try {
      const event = await createEvent({
        title,
        description: description || undefined,
        location: location || undefined,
        event_type: eventType,
        starts_at: new Date(startsAt).toISOString(),
        requires_registration: requiresRegistration,
        capacity: capacity ? Number(capacity) : undefined,
      });
      onCreated(event);
    } catch {
      toast.error('Could not create the event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card mb-4 space-y-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">New event</h2>
        <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-field" />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="input-field"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="input-field"
      />
      <div className="flex gap-2">
        <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className="input-field">
          <option value="other">Event</option>
          <option value="class">Class</option>
          <option value="seminar">Seminar</option>
        </select>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="input-field"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={requiresRegistration}
          onChange={(e) => setRequiresRegistration(e.target.checked)}
          className="rounded border-gray-300 text-primary focus:ring-primary-200"
        />
        Requires registration
      </label>
      {requiresRegistration && (
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="Capacity (optional)"
          className="input-field"
        />
      )}
      <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating…' : 'Create event'}
      </button>
    </div>
  );
}
