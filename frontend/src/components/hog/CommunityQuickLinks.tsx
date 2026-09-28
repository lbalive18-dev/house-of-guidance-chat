import { Link } from 'react-router-dom';
import { CalendarDays, Megaphone, Users } from 'lucide-react';

const links = [
  { to: '/rooms', icon: Users, label: 'Rooms' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
];

export default function CommunityQuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {links.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className="glass-tile group flex min-w-0 flex-col items-center gap-2 px-2 py-4 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary-400/90 to-secondary-600/90 text-[#17352a] shadow-[0_8px_20px_rgba(212,175,55,.35)] transition group-hover:scale-105">
            <Icon className="h-5 w-5" />
          </span>
          <span className="w-full truncate text-[11px] font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        </Link>
      ))}
    </div>
  );
}
