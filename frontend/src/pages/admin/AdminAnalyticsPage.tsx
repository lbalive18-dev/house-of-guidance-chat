import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import SimpleBarChart from '@/components/admin/SimpleBarChart';
import { fetchAnalytics } from '@/lib/adminApi';
import type { AnalyticsOverview } from '@/types/admin';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    fetchAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Users
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Total users" value={data.users.total} />
            <StatCard label="Online now" value={data.users.online_now} />
            <StatCard label="Active (7d)" value={data.users.active_last_7_days} />
            <StatCard label="New (30d)" value={data.users.new_last_30_days} />
            <StatCard label="Students" value={data.users.students} />
            <StatCard label="Teachers" value={data.users.teachers} />
            <StatCard label="Verified" value={data.users.verified} />
            <StatCard label="Banned" value={data.users.banned} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Chats
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Private chats" value={data.chats.private_conversations} />
            <StatCard label="Groups" value={data.chats.groups} />
            <StatCard label="Rooms" value={data.chats.rooms} />
            <StatCard label="Total messages" value={data.chats.total_messages} />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card px-5 py-4">
            <SimpleBarChart data={data.messages_per_day} label="Messages / day (last 14 days)" />
          </div>
          <div className="card px-5 py-4">
            <SimpleBarChart data={data.signups_per_day} label="Signups / day (last 14 days)" />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Community & Moderation
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Upcoming events" value={data.community.upcoming_events} />
            <StatCard label="Registrations" value={data.community.total_registrations} />
            <StatCard label="Pending reports" value={data.moderation.pending_reports} />
            <StatCard label="Resolved reports" value={data.moderation.resolved_reports} />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
