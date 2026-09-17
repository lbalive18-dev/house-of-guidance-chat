import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageCircle,
  BookOpen,
  Clock,
  Compass,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Bell,
  BookMarked,
  Scroll,
  Calendar,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/chat/*', label: 'Chat', icon: MessageCircle },
    { divider: true },
    { label: 'Islamic', heading: true },
    { path: '/islamic/quran', label: 'Qur\'an', icon: BookOpen },
    { path: '/islamic/hadith', label: 'Hadith', icon: Scroll },
    { path: '/islamic/duas', label: 'Duas', icon: BookMarked },
    { path: '/islamic/prayer-times', label: 'Prayer Times', icon: Clock },
    { path: '/islamic/qiblah', label: 'Qiblah', icon: Compass },
    { path: '/islamic/calendar', label: 'Calendar', icon: Calendar },
    { divider: true },
    { label: 'Community', heading: true },
    { path: '/rooms', label: 'Rooms', icon: Users },
    { path: '/announcements', label: 'Announcements', icon: Bell },
    { path: '/events', label: 'Events', icon: Calendar },
    ...(user?.role === 'admin' ? [
      { divider: true },
      { label: 'Admin', heading: true },
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/reports', label: 'Reports', icon: Scroll },
      { path: '/admin/broadcast', label: 'Broadcast', icon: MessageCircle },
      { path: '/admin/analytics', label: 'Analytics', icon: BookOpen },
    ] : []),
    { divider: true },
    { path: '/settings/profile', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-primary text-white p-2 rounded-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto transform transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:translate-x-0 z-40`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">HOG Chat</h1>
        </div>

        <nav className="px-4 py-6 space-y-2">
          {menuItems.map((item, idx) => {
            if (item.divider) {
              return <hr key={`divider-${idx}`} className="my-4 border-gray-200 dark:border-gray-800" />;
            }

            if (item.heading) {
              return (
                <div key={`heading-${idx}`} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {item.label}
                </div>
              );
            }

            const Icon = item.icon || Home;
            const active = item.path ? isActive(item.path) : false;

            return (
              <Link
                key={item.path}
                to={item.path || '#'}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
