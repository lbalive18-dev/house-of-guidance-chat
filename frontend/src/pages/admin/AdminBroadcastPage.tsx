import { useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { sendBroadcast } from '@/lib/adminApi';

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'students' | 'teachers' | 'admins'>('all');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Add a title and message.');
      return;
    }

    setSending(true);
    try {
      const result = await sendBroadcast({ title, body, audience });
      toast.success(result.message);
      setTitle('');
      setBody('');
    } catch {
      toast.error('Could not send the broadcast.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="card px-5 py-5">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-50">Send a broadcast notification</h2>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="input-field"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message"
            rows={4}
            className="input-field"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Audience
            </label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="input-field"
            >
              <option value="all">Everyone</option>
              <option value="students">Students only</option>
              <option value="teachers">Teachers only</option>
              <option value="admins">Admins only</option>
            </select>
          </div>
          <button onClick={handleSend} disabled={sending} className="btn-primary w-full">
            {sending ? 'Sending…' : 'Send broadcast'}
          </button>
          <p className="text-xs text-gray-400">
            Delivered as an in-app notification (via the queue) to every matching user.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
