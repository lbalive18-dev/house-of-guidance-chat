import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Megaphone, Pin, Plus, Trash2, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
} from '@/lib/announcementsApi';
import type { Announcement } from '@/types/hog';

export default function AnnouncementsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canPost = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAnnouncements()
      .then((res) => setAnnouncements(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Could not delete that announcement.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-full p-1.5 text-gray-500 hover:bg-primary-50 dark:hover:bg-primary-900/30">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Announcements</h1>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(true)} className="btn-primary px-3 py-1.5 text-xs">
            <Plus className="h-4 w-4" /> New
          </button>
        )}
      </div>

      {showForm && (
        <AnnouncementForm
          onClose={() => setShowForm(false)}
          onCreated={(announcement) => {
            setAnnouncements((prev) => [announcement, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && announcements.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-800">
          <Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No announcements yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="card px-5 py-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {announcement.pinned && <Pin className="h-4 w-4 shrink-0 text-secondary-600" />}
                <h3 className="font-semibold text-gray-900 dark:text-gray-50">{announcement.title}</h3>
              </div>
              {(currentUser?.id === announcement.author.id || currentUser?.role === 'admin') && (
                <button
                  onClick={() => handleDelete(announcement.id)}
                  className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{announcement.body}</p>
            <div className="mt-3 flex items-center gap-2">
              <Avatar name={announcement.author.name} avatarUrl={announcement.author.avatar_url} size="sm" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {announcement.author.name} ·{' '}
                {new Date(announcement.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (announcement: Announcement) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'students' | 'teachers'>('all');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Add a title and message.');
      return;
    }
    setSubmitting(true);
    try {
      const announcement = await createAnnouncement({ title, body, audience, pinned });
      onCreated(announcement);
    } catch {
      toast.error('Could not post the announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card mb-4 space-y-3 px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">New announcement</h2>
        <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-field" />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message"
        rows={4}
        className="input-field"
      />
      <div className="flex items-center gap-3">
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as typeof audience)}
          className="input-field w-auto"
        >
          <option value="all">Everyone</option>
          <option value="students">Students only</option>
          <option value="teachers">Teachers only</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary-200"
          />
          Pin to top
        </label>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Posting…' : 'Post announcement'}
      </button>
    </div>
  );
}
