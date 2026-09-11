import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Flag, Trash2, X } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { fetchReports, resolveReport } from '@/lib/adminApi';
import type { Report } from '@/types/admin';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'dismissed' | ''>('pending');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchReports(statusFilter || undefined)
      .then((res) => setReports(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleResolve = async (report: Report, status: 'resolved' | 'dismissed', deleteContent = false) => {
    try {
      const updated = await resolveReport(report.id, status, deleteContent);
      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)));
      toast.success(status === 'resolved' ? 'Report resolved.' : 'Report dismissed.');
    } catch {
      toast.error('Could not update that report.');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-4 flex gap-1.5">
        {(['pending', 'resolved', 'dismissed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              statusFilter === status
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-800">
          <Flag className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No {statusFilter || ''} reports.</p>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((report) => (
          <div key={report.id} className="card px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="rounded-full bg-secondary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
                  {report.reportable_type}
                </span>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-50">{report.reason}</p>
              </div>
              <span className="whitespace-nowrap text-xs text-gray-400">
                by {report.reporter.name}
              </span>
            </div>

            {report.details && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{report.details}</p>
            )}

            {report.reportable && (
              <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800/60">
                {report.reportable_type === 'message' ? (
                  <>
                    <p className="text-xs text-gray-400">
                      From {report.reportable.sender_name}
                      {report.reportable.is_deleted && ' · already deleted'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-200">
                      {report.reportable.body ?? '(no longer available)'}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-700 dark:text-gray-200">
                    User: {report.reportable.name}
                    {report.reportable.is_banned && ' · already banned'}
                  </p>
                )}
              </div>
            )}

            {report.status === 'pending' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {report.reportable_type === 'message' && !report.reportable?.is_deleted && (
                  <button
                    onClick={() => handleResolve(report, 'resolved', true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete & resolve
                  </button>
                )}
                <button
                  onClick={() => handleResolve(report, 'resolved')}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
                >
                  <Check className="h-3.5 w-3.5" /> Resolve
                </button>
                <button
                  onClick={() => handleResolve(report, 'dismissed')}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <X className="h-3.5 w-3.5" /> Dismiss
                </button>
              </div>
            )}

            {report.status !== 'pending' && (
              <p className="mt-3 text-xs text-gray-400">
                {report.status === 'resolved' ? 'Resolved' : 'Dismissed'} by {report.resolver?.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
