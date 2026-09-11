import { useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { createReport } from '@/lib/reportsApi';

const REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other'];

export default function ReportModal({
  reportableType,
  reportableId,
  onClose,
}: {
  reportableType: 'message' | 'user';
  reportableId: number;
  onClose: () => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await createReport({
        reportable_type: reportableType,
        reportable_id: reportableId,
        reason,
        details: details || undefined,
      });
      toast.success('Report submitted. Thank you.');
      onClose();
    } catch {
      toast.error('Could not submit your report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-card dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">
            Report {reportableType === 'message' ? 'message' : 'user'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-field">
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Additional details (optional)"
            rows={3}
            className="input-field"
          />
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
