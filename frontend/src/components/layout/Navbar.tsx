import { useState } from 'react';
import { BookOpenText, CalendarDays, Home, LogOut, Moon, Settings, ShieldCheck, Sun, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import NotificationsBell from '@/components/dashboard/NotificationsBell';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/5 bg-white/90 shadow-[0_4px_24px_rgba(15,63,48,0.04)] backdrop-blur-xl dark:border-white/5 dark:bg-surface-dark/90">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src="/hog-logo.png" alt="House of Guidance" className="h-10 w-10 shrink-0 rounded-full object-contain ring-1 ring-secondary/40" />
          <span className="text-base font-bold leading-tight text-primary dark:text-primary-200">
            House of Guidance
            <span className="block text-[11px] font-medium tracking-wide text-secondary-600 dark:text-secondary-300">
              CHAT
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {[
            { to: '/', label: 'Home', icon: Home },
            { to: '/rooms', label: 'Rooms', icon: Users },
            { to: '/islamic/quran', label: 'Qur’an', icon: BookOpenText },
            { to: '/events', label: 'Events', icon: CalendarDays },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-primary-50 hover:text-primary dark:text-emerald-50/70 dark:hover:bg-emerald-900/50 dark:hover:text-secondary-200">
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationsBell />}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/40"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-primary-100"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" showOnline isOnline={user.is_online} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1.5 shadow-card dark:border-gray-800 dark:bg-gray-900">
                    <div className="px-3.5 py-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{user.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    <hr className="my-1 border-gray-100 dark:border-gray-800" />
                    <Link
                      to="/settings/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-primary-900/30"
                    >
                      <Settings className="h-4 w-4" />
                      Profile settings
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin/users"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-primary-900/30"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Admin panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
