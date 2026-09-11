import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { searchUsers } from '@/lib/usersApi';
import { startConversation } from '@/lib/chatApi';
import Avatar from '@/components/ui/Avatar';
import type { User } from '@/types/auth';

export default function SearchUsers() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      searchUsers(query)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (user: User) => {
    setStarting(user.id);
    try {
      const conversation = await startConversation(user.id);
      setOpen(false);
      setQuery('');
      navigate(`/chat/${conversation.id}`);
    } catch {
      toast.error('Could not start a conversation with this user.');
    } finally {
      setStarting(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search people by name or email…"
          className="input-field pl-10 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
          {loading && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}

          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">No people found for &ldquo;{query}&rdquo;.</p>
          )}

          {!loading &&
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                disabled={starting === user.id}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50 disabled:opacity-60 dark:hover:bg-primary-900/20"
              >
                <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" showOnline isOnline={user.is_online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">{user.name}</p>
                  <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">{user.role}</p>
                </div>
                {starting === user.id && (
                  <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
