import { Link } from 'react-router-dom';
import { CalendarDays, Megaphone, Users } from 'lucide-react';

const links = [
  { to: '/rooms', icon: Users, label: 'Rooms' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/events', icon: CalendarDays, label: 'Events' },
];

export default function CommunityQuickLinks() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {links.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-white px-2 py-3 text-center hover:bg-primary-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-primary-900/20"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-50 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300">
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{label}</span>
        </Link>
      ))}
    </div>
  );
}
