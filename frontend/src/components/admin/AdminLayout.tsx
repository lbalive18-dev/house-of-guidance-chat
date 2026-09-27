import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CalendarPlus, Flag, Megaphone, Users } from 'lucide-react';

const TABS = [
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/reports', icon: Flag, label: 'Reports' },
  { to: '/admin/broadcast', icon: Megaphone, label: 'Broadcast' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-secondary/25 bg-gradient-to-r from-[#063b2d] to-[#08271e] px-5 py-5 text-white shadow-[0_18px_48px_rgba(3,38,29,.18)] md:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-secondary-200">House of Guidance</p>
          <h1 className="mt-1 text-2xl font-semibold">Admin workspace</h1>
          <p className="mt-1 text-sm text-emerald-50/70">Manage members, events, and community activity.</p>
        </div>
        <Link to="/events" className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-[#17352a] transition hover:-translate-y-0.5 hover:bg-secondary-200">
          <CalendarPlus className="h-4 w-4" /> Events
        </Link>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-emerald-100 bg-white/80 p-1.5 shadow-sm dark:border-emerald-100/10 dark:bg-[#06251c]">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-primary text-white shadow-sm dark:bg-[#0b6e4f] dark:text-secondary-100'
                  : 'text-gray-500 hover:bg-primary-50 hover:text-primary dark:text-emerald-50/65 dark:hover:bg-emerald-900/40 dark:hover:text-secondary-100'
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
