import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Loader2, Search, Users, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { apiErrorMessage } from '@/lib/apiError';
import { searchUsers } from '@/lib/usersApi';
import { createGroup } from '@/lib/groupsApi';
import type { User } from '@/types/auth';

export default function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searchError, setSearchError] = useState('');
  const [createError, setCreateError] = useState('');
  const [selected, setSelected] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      searchUsers(value)
        .then((users) => {
          setSearchError('');
          setResults(users.filter((u) => !selected.some((s) => s.id === u.id)));
        })
        .catch(() => {
          setResults([]);
          setSearchError('Search is unavailable right now. Check your connection and try again.');
        });
    }, 300);
  };

  const toggleSelect = (user: User) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
    setResults((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Give the group a name.');
      return;
    }
    if (selected.length === 0) {
      toast.error('Add at least one member.');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const group = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        member_ids: selected.map((u) => u.id),
        avatar: avatarFile ?? undefined,
      });
      toast.success('Group created!');
      onClose();
      navigate(`/chat/${group.id}`);
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not create the group.');
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-card dark:bg-gray-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">New group</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Group avatar" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  <Users className="h-7 w-7" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                className="input-field"
              />
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Group description (optional)"
            rows={2}
            className="input-field"
          />

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((user) => (
                <span
                  key={user.id}
                  className="flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-1 pr-2 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"
                >
                  <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                  {user.name.split(' ')[0]}
                  <button onClick={() => toggleSelect(user)} className="text-primary-400 hover:text-primary-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Add members…"
              className="input-field pl-10"
            />
          </div>

          {searchError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {searchError}
            </p>
          )}

          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
              {results.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleSelect(user)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20"
                >
                  <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">{user.name}</p>
                    <p className="truncate text-xs capitalize text-gray-500 dark:text-gray-400">{user.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          {createError && (
            <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {createError}
            </p>
          )}
          <button onClick={() => void handleCreate()} disabled={creating} className="btn-primary w-full">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create group'}
          </button>
        </div>
      </div>
    </div>
  );
}
