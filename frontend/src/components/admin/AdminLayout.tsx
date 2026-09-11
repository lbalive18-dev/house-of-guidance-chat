import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Flag, Megaphone, Users } from 'lucide-react';

const TABS = [
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/reports', icon: Flag, label: 'Reports' },
  { to: '/admin/broadcast', icon: Megaphone, label: 'Broadcast' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-50">Admin Panel</h1>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Manage users, moderate content, and view community analytics.
      </p>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
