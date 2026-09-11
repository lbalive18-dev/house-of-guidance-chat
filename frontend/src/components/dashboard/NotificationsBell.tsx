import { useEffect, useRef, useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notificationsApi';
import type { AppNotification } from '@/types/notification';

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount().then(setUnreadCount);
    const interval = setInterval(() => {
      fetchUnreadCount().then(setUnreadCount);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openPanel = () => {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      fetchNotifications()
        .then((res) => setNotifications(res.data))
        .finally(() => setLoading(false));
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    }
    if (notification.data.action_url) {
      window.location.href = notification.data.action_url;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-primary-50 hover:text-primary dark:text-gray-400 dark:hover:bg-primary-900/40"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-primary-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-medium text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-center text-sm text-gray-400">Loading…</p>}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">You&apos;re all caught up.</p>
            )}

            {!loading &&
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-primary-50 dark:border-gray-800/60 dark:hover:bg-primary-900/20 ${
                    !notification.read_at ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''
                  }`}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                      {notification.data.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{notification.data.body}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.read_at && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
