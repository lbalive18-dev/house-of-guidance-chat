import { useState } from 'react';
import { LogOut, Moon, Settings, ShieldCheck, Sun } from 'lucide-react';
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
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-surface-dark/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-secondary"
            aria-hidden="true"
          >
            {/* Logo placeholder: replace with the House of Guidance emblem */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 2L2 8l10 6 10-6-10-6zM2 16l10 6 10-6M2 12l10 6 10-6" />
            </svg>
          </span>
          <span className="text-base font-bold leading-tight text-primary dark:text-primary-200">
            House of Guidance
            <span className="block text-[11px] font-medium tracking-wide text-secondary-600 dark:text-secondary-300">
              CHAT
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user && <NotificationsBell />}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/40"
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
