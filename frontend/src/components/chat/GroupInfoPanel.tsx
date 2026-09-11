import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Crown, LogOut, Search, Shield, UserMinus, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { searchUsers } from '@/lib/usersApi';
import {
  addGroupMembers,
  removeGroupMember,
  updateGroup,
  updateGroupMemberRole,
} from '@/lib/groupsApi';
import { useAuthStore } from '@/store/authStore';
import type { Conversation, GroupMember } from '@/types/chat';
import type { User } from '@/types/auth';

export default function GroupInfoPanel({
  conversation,
  onClose,
  onUpdated,
}: {
  conversation: Conversation;
  onClose: () => void;
  onUpdated: (conversation: Conversation) => void;
}) {
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const isAdmin = conversation.my_role === 'admin';
  const members = conversation.members ?? [];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [savingDescription, setSavingDescription] = useState(false);
  const [description, setDescription] = useState(conversation.description ?? '');
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
      searchUsers(value).then((users) =>
        setResults(users.filter((u) => !members.some((m) => m.id === u.id)))
      );
    }, 300);
  };

  const handleAddMember = async (user: User) => {
    try {
      const updated = await addGroupMembers(conversation.id, [user.id]);
      onUpdated(updated);
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`${user.name} added to the group.`);
    } catch {
      toast.error('Could not add that member.');
    }
  };

  const handleRemoveMember = async (member: GroupMember) => {
    try {
      await removeGroupMember(conversation.id, member.id);
      onUpdated({
        ...conversation,
        members: members.filter((m) => m.id !== member.id),
        participant_count: (conversation.participant_count ?? 1) - 1,
      });
      toast.success(`${member.name} removed from the group.`);
    } catch {
      toast.error('Could not remove that member. A group needs at least one admin.');
    }
  };

  const handleToggleAdmin = async (member: GroupMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    try {
      const updated = await updateGroupMemberRole(conversation.id, member.id, newRole);
      onUpdated(updated);
    } catch {
      toast.error('Could not update that role. A group needs at least one admin.');
    }
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    try {
      await removeGroupMember(conversation.id, currentUser.id);
      toast.success('You left the group.');
      onClose();
      navigate('/');
    } catch {
      toast.error('Could not leave the group. Promote another admin first.');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await updateGroup(conversation.id, { avatar: file });
      onUpdated(updated);
    } catch {
      toast.error('Could not update the group photo.');
    }
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    try {
      const updated = await updateGroup(conversation.id, { description });
      onUpdated(updated);
      toast.success('Description updated.');
    } catch {
      toast.error('Could not update the description.');
    } finally {
      setSavingDescription(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-sm overflow-y-auto bg-white shadow-card dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Group info</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-5 py-6">
          <button
            type="button"
            onClick={() => isAdmin && fileInputRef.current?.click()}
            className="relative"
            disabled={!isAdmin}
          >
            <Avatar name={conversation.name ?? ''} avatarUrl={conversation.avatar_url} size="xl" />
            {isAdmin && (
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">
                <Camera className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{conversation.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{conversation.participant_count} members</p>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Description
          </label>
          {isAdmin ? (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="input-field"
              />
              <button
                onClick={handleSaveDescription}
                disabled={savingDescription}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {conversation.description || 'No description yet.'}
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Add members
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search people…"
                className="input-field pl-10"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800">
                {results.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  >
                    <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">{user.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {members.length} members
          </label>
          <div className="space-y-1">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <Avatar name={member.name} avatarUrl={member.avatar_url} showOnline isOnline={member.is_online} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                    {member.name}
                    {member.id === currentUser?.id && ' (you)'}
                  </p>
                  {member.role === 'admin' && (
                    <p className="flex items-center gap-1 text-xs text-secondary-600 dark:text-secondary-300">
                      <Crown className="h-3 w-3" /> Admin
                    </p>
                  )}
                </div>
                {isAdmin && member.id !== currentUser?.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleAdmin(member)}
                      title={member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30"
                    >
                      <Shield className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member)}
                      title="Remove from group"
                      className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button
            onClick={handleLeave}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Leave group
          </button>
        </div>
      </div>
    </div>
  );
}
