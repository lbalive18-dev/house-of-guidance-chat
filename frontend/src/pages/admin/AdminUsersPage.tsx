import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, ShieldBan, ShieldCheck } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import Avatar from '@/components/ui/Avatar';
import { banUser, fetchAdminUsers, unbanUser, updateUserRole } from '@/lib/adminApi';
import { useAuthStore } from '@/store/authStore';
import type { User, UserRole } from '@/types/auth';

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [loading, setLoading] = useState(true);
  const [banningId, setBanningId] = useState<number | null>(null);
  const [banReason, setBanReason] = useState('');

  const load = () => {
    setLoading(true);
    fetchAdminUsers({ q: query || undefined, role: roleFilter || undefined })
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, roleFilter]);

  const handleRoleChange = async (user: User, role: UserRole) => {
    try {
      const updated = await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(`${user.name} is now a ${role}.`);
    } catch {
      toast.error('Could not update that role.');
    }
  };

  const handleConfirmBan = async (user: User) => {
    if (!banReason.trim()) {
      toast.error('Add a reason for the ban.');
      return;
    }
    try {
      const updated = await banUser(user.id, banReason.trim());
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(`${user.name} has been banned.`);
      setBanningId(null);
      setBanReason('');
    } catch {
      toast.error('Could not ban that user.');
    }
  };

  const handleUnban = async (user: User) => {
    try {
      const updated = await unbanUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(`${user.name} has been unbanned.`);
    } catch {
      toast.error('Could not unban that user.');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="input-field pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
          className="input-field w-auto"
        >
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      <div className="space-y-2">
        {!loading &&
          users.map((user) => (
            <div key={user.id} className="card px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} avatarUrl={user.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-50">
                    {user.name}
                    {user.id === currentUser?.id && ' (you)'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                {user.is_banned ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40">
                    Banned
                  </span>
                ) : (
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                    disabled={user.id === currentUser?.id}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs capitalize dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                {user.id !== currentUser?.id && user.role !== 'admin' && (
                  user.is_banned ? (
                    <button
                      onClick={() => handleUnban(user)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30"
                      title="Unban"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setBanningId(banningId === user.id ? null : user.id)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                      title="Ban"
                    >
                      <ShieldBan className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>

              {banningId === user.id && (
                <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Reason for ban…"
                    className="input-field flex-1"
                  />
                  <button onClick={() => handleConfirmBan(user)} className="btn-primary px-3 py-1.5 text-xs">
                    Confirm ban
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </AdminLayout>
  );
}
