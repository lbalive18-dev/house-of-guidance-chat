import { Link } from 'react-router-dom';
import { Book, BookOpenText, Calendar, Clock, Compass, ScrollText } from 'lucide-react';

const links = [
  { to: '/islamic/quran/read', icon: BookOpenText, label: 'Qur’an' },
  { to: '/islamic/hadith', icon: ScrollText, label: 'Hadith' },
  { to: '/islamic/prayer-times', icon: Clock, label: 'Prayer Times' },
  { to: '/islamic/qiblah', icon: Compass, label: 'Qiblah' },
  { to: '/islamic/duas', icon: Book, label: 'Dua Library' },
  { to: '/islamic/calendar', icon: Calendar, label: 'Calendar' },
];

export default function IslamicQuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
      {links.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className="glass-tile group flex min-w-0 flex-col items-center gap-2 px-2 py-4 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/90 to-primary-700/90 text-white shadow-[0_8px_20px_rgba(11,110,79,.35)] transition group-hover:scale-105">
            <Icon className="h-5 w-5" />
          </span>
          <span className="w-full truncate text-[11px] font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        </Link>
      ))}
    </div>
  );
}
