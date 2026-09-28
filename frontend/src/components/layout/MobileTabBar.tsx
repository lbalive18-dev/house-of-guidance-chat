import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Settings, Users } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Home', icon: Home, active: (path: string) => path === '/' },
  { to: '/#messages', label: 'Messages', icon: MessageCircle, active: (path: string) => path.startsWith('/chat') },
  { to: '/rooms', label: 'Community', icon: Users, active: (path: string) => ['/rooms', '/events', '/announcements'].includes(path) },
  { to: '/settings', label: 'Settings', icon: Settings, active: (path: string) => path.startsWith('/settings') },
];

export default function MobileTabBar() {
  const location = useLocation();

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary/20 bg-[#041b15]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_36px_rgba(0,0,0,.24)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {TABS.map(({ to, label, icon: Icon, active }) => {
          const selected = active(location.pathname);
          return (
            <Link key={label} to={to} aria-current={selected ? 'page' : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${selected ? 'text-secondary-200' : 'text-emerald-50/55 hover:text-emerald-50'}`}>
              <Icon className={`h-[19px] w-[19px] ${selected ? 'drop-shadow-[0_0_8px_rgba(229,196,95,.45)]' : ''}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
