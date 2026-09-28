import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/axios';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/store/authStore';

interface ClaimStatus {
  admin_exists: boolean;
  configured: boolean;
  verified: boolean;
  eligible: boolean;
  is_admin: boolean;
  mail_configured: boolean;
}

/**
 * One-time first-admin claim — the supported path on hosts without server
 * shell access (Render free plan). Requires a verified email and a server
 * allowlist value; disables itself permanently once any admin exists.
 */
export default function AdminClaimPage() {
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<ClaimStatus | null>(null);

  useEffect(() => {
    api
      .get<ClaimStatus>('/api/admin/claim/status')
      .then(({ data }) => setStatus(data))
      .catch(() => undefined);
  }, []);

  const handleClaim = async () => {
    setBusy(true);
    try {
      await api.post('/api/admin/claim');
      await loadUser();
      setDone(true);
      toast.success('Admin access granted.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not claim admin access.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-14">
      <div className="card px-6 py-7 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary dark:bg-primary-900/40">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Become the first admin</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
          For new installs without server shell access. Sign in with your own account, verify your
          email, then claim admin once. This page stops working as soon as any admin exists.
        </p>

        <div className="mt-5 rounded-2xl bg-gray-50 px-4 py-3 text-left text-xs leading-5 text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          <p className="font-bold text-gray-700 dark:text-gray-200">Safe steps</p>
          <ol className="mt-1 list-decimal pl-5">
            <li>Register and sign in with your own email.</li>
            <li>Verify your email via the link we send you.</li>
            <li>
              In the Render dashboard, set the environment variable named{' '}
              <code className="rounded bg-gray-200 px-1 dark:bg-gray-800">FIRST_ADMIN_EMAIL</code>{' '}
              to that same email, save, and wait for the service to redeploy.
            </li>
            <li>Return here while signed in and press Claim admin.</li>
          </ol>
          {user && (
            <p className="mt-2">
              Signed in as <strong>{user.email}</strong>
              {user.email_verified_at ? ' (verified)' : ' (not verified yet)'}.
            </p>
          )}
        </div>

        {status && !status.is_admin && user?.role !== 'admin' && (
          <div className="mt-4 space-y-1.5 rounded-2xl border border-gray-200 px-4 py-3 text-left text-xs leading-5 dark:border-gray-800">
            <StatusRow ok={!status.admin_exists} label="No admin exists yet" hint={status.admin_exists ? 'An admin already claimed access — ask them to upgrade you.' : 'Good — the claim is still open.'} />
            <StatusRow ok={status.configured} label="Server allowlist is set" hint={status.configured ? 'Server is configured.' : 'FIRST_ADMIN_EMAIL is missing on the server — set it in the Render dashboard and redeploy.'} />
            <StatusRow ok={status.verified} label="Your email is verified" hint={status.verified ? `Verified as ${user?.email}.` : status.mail_configured ? 'Open the verification link in your inbox first (check spam, or resend from the verify page).' : 'The server cannot send emails yet — set BREVO_API_KEY in the Render dashboard and redeploy, then resend the verification email.'} />
            <StatusRow ok={status.eligible} label="Signed in with the allowlisted email" hint={status.eligible ? 'This account matches.' : 'Sign in with the exact email you put in FIRST_ADMIN_EMAIL.'} />
          </div>
        )}

        {done || user?.role === 'admin' ? (
          <Link to="/admin/users" className="btn-primary mt-6 w-full">
            Open admin panel
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void handleClaim()}
            disabled={busy}
            className="btn-primary mt-6 w-full"
            title={!user?.email_verified_at ? 'The server will tell you exactly what is missing' : undefined}
          >
            {busy ? 'Claiming…' : 'Claim admin'}
          </button>
        )}
        {!user?.email_verified_at && user?.role !== 'admin' && (
          <Link to="/verify-email" className="mt-3 block text-xs font-semibold text-primary hover:underline">
            Verify your email first
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusRow({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      />
      <div>
        <p className="font-bold text-gray-700 dark:text-gray-200">{label}</p>
        <p className="text-gray-500 dark:text-gray-400">{hint}</p>
      </div>
    </div>
  );
}
