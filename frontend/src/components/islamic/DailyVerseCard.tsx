import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { fetchDailyVerse } from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { DailyVerse } from '@/types/islamic';

export default function DailyVerseCard() {
  const [verse, setVerse] = useState<DailyVerse | null>(null);

  useEffect(() => {
    fetchDailyVerse().then(setVerse);
  }, []);

  if (!verse) {
    return <div className="card h-40 animate-pulse" />;
  }

  const shareText = `"${verse.translation}"\n— Qur'an, Surah ${verse.surah}, Ayah ${verse.ayah}\n\nShared from House of Guidance Chat`;

  return (
    <div className="card px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          Verse of the Day
        </span>
        <ShareReminderButton text={shareText} />
      </div>
      <p dir="rtl" className="font-arabic text-right text-xl leading-relaxed text-gray-900 dark:text-gray-50">
        {verse.arabic}
      </p>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{verse.translation}</p>
      <p className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-300">
        Surah {verse.surah}, Ayah {verse.ayah}
      </p>
    </div>
  );
}
