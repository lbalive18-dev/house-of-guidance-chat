import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchHijriCalendar, fetchHijriDate } from '@/lib/islamicApi';
import type { HijriCalendarDay, HijriDate } from '@/types/islamic';

export default function IslamicCalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [hijriToday, setHijriToday] = useState<HijriDate | null>(null);
  const [days, setDays] = useState<HijriCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHijriDate().then(setHijriToday);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchHijriCalendar(month, year)
      .then(setDays)
      .finally(() => setLoading(false));
  }, [month, year]);

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Islamic Calendar</h1>
      </div>

      {hijriToday && (
        <div className="card mb-5 px-5 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Today</p>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-50">{hijriToday.formatted}</p>
          <p dir="rtl" className="font-arabic mt-1 text-gray-500 dark:text-gray-400">
            {hijriToday.day} {hijriToday.month.ar} {hijriToday.year}
          </p>
          {hijriToday.holidays.length > 0 && (
            <p className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-300">
              {hijriToday.holidays.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">{monthLabel}</h2>
        <button
          onClick={() => changeMonth(1)}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const gregorianDay = new Date(day.gregorian_date).getDate();
            const isToday = new Date(day.gregorian_date).toDateString() === today.toDateString();
            const hasHoliday = day.holidays.length > 0;

            return (
              <div
                key={day.gregorian_date}
                title={hasHoliday ? day.holidays.join(', ') : undefined}
                className={`flex flex-col items-center rounded-lg px-1 py-2 text-center ${
                  isToday
                    ? 'bg-primary text-white'
                    : hasHoliday
                      ? 'bg-secondary-50 dark:bg-secondary-900/30'
                      : 'bg-gray-50 dark:bg-gray-800/60'
                }`}
              >
                <span className={`text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                  {gregorianDay}
                </span>
                <span className={`text-[10px] ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                  {day.hijri_day}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
