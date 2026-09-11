import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { fetchDailyHadith } from '@/lib/islamicApi';
import ShareReminderButton from '@/components/islamic/ShareReminderButton';
import type { Hadith } from '@/types/islamic';

export default function DailyHadithCard() {
  const [hadith, setHadith] = useState<Hadith | null>(null);

  useEffect(() => {
    fetchDailyHadith().then(setHadith);
  }, []);

  if (!hadith) {
    return <div className="card h-40 animate-pulse" />;
  }

  const shareText = `"${hadith.text}"\n${hadith.narrator ? `— Narrated by ${hadith.narrator}, ` : '— '}${hadith.reference}\n\nShared from House of Guidance Chat`;

  return (
    <div className="card px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <ScrollText className="h-3.5 w-3.5" />
          Hadith of the Day
        </span>
        <ShareReminderButton text={shareText} />
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-200">&ldquo;{hadith.text}&rdquo;</p>
      <p className="mt-2 text-xs font-medium text-secondary-600 dark:text-secondary-300">
        {hadith.narrator && `Narrated by ${hadith.narrator} · `}
        {hadith.reference}
      </p>
    </div>
  );
}
