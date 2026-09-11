import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, RefreshCw } from 'lucide-react';
import { fetchPrayerTimes } from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { PrayerTimes } from '@/types/islamic';

const PRAYER_ORDER: Array<keyof PrayerTimes['timings']> = [
  'Fajr',
  'Sunrise',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
];

function parseTimeToday(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default function PrayerTimesPage() {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Your browser does not support location access.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchPrayerTimes(position.coords.latitude, position.coords.longitude)
          .then(setTimes)
          .catch(() => setError('Prayer times are temporarily unavailable.'))
          .finally(() => setLoading(false));
      },
      () => {
        setError('Location access is needed to show accurate prayer times.');
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextPrayer = useMemo(() => {
    if (!times) return null;
    const now = new Date();

    for (const name of PRAYER_ORDER) {
      const time = parseTimeToday(times.timings[name]);
      if (time > now) return name;
    }
    return PRAYER_ORDER[0];
  }, [times]);

  const shareText = times
    ? `Today's prayer times:\n${PRAYER_ORDER.map((name) => `${name}: ${times.timings[name]}`).join('\n')}\n\nShared from House of Guidance Chat`
    : '';

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Prayer Times</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <MapPin className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button onClick={load} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {!loading && times && (
        <div className="card px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{times.date.readable}</p>
            <ShareReminderButton text={shareText} />
          </div>

          <div className="space-y-1">
            {PRAYER_ORDER.map((name) => (
              <div
                key={name}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                  name === nextPrayer ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                }`}
              >
                <span
                  className={`text-sm ${
                    name === nextPrayer
                      ? 'font-semibold text-primary'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {name}
                  {name === nextPrayer && (
                    <span className="ml-2 text-xs font-normal text-secondary-600 dark:text-secondary-300">
                      Next
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                  {times.timings[name]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
