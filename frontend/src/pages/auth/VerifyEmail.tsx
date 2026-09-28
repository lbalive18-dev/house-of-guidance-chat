import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, MailWarning } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';
import { resendVerificationEmail, verifyEmail, verifyEmailCode } from '@/lib/authApi';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/store/authStore';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { user, loadUser } = useAuthStore();
  const verifyUrl = searchParams.get('verify_url');
  const [state, setState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [resending, setResending] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    if (!verifyUrl) return;
    setState('verifying');
    verifyEmail(verifyUrl)
      .then(() => {
        setState('success');
        loadUser();
      })
      .catch(() => setState('error'));
  }, [verifyUrl, loadUser]);

  const handleResend = async () => {
    setResending(true);
    try {
      const message = await resendVerificationEmail();
      toast.success(message);
    } catch {
      toast.error('Could not resend the verification email. Please try again shortly.');
    } finally {
      setResending(false);
    }
  };

  const handleCode = async () => {
    if (!/^[0-9]{6}$/.test(code)) {
      toast.error('Enter the 6-digit code from the email.');
      return;
    }
    setCodeBusy(true);
    try {
      await verifyEmailCode(code);
      setState('success');
      loadUser();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'That code did not work.'));
    } finally {
      setCodeBusy(false);
    }
  };

  if (state === 'success' || user?.email_verified_at) {
    return (
      <AuthLayout title="Email verified">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your email address has been verified. Jazak Allahu khayran!
          </p>
          <Link to="/" className="btn-primary mt-4 w-full">
            Go to dashboard
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (state === 'error') {
    return (
      <AuthLayout title="Verification link invalid">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailWarning className="h-12 w-12 text-secondary-600" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This verification link has expired or was already used. Request a fresh one below.
          </p>
          <button onClick={handleResend} disabled={resending} className="btn-primary mt-4 w-full">
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify your email" subtitle="One more step to get started">
      <div className="flex flex-col items-center gap-3 text-center">
        <MailWarning className="h-12 w-12 text-secondary-600" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          We&apos;ve sent a verification link to <strong>{user?.email}</strong>. Click the
          link in that email to activate your account.
        </p>
        <button onClick={handleResend} disabled={resending} className="btn-secondary mt-4 w-full">
          {resending ? 'Sending…' : "Didn't get it? Resend email"}
        </button>
        <div className="mt-4 w-full rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Have a code instead?
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The same email carries a 6-digit code under the button — type it here, no link needed.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              aria-label="6-digit verification code"
              className="input-field text-center text-lg font-bold tracking-[0.3em]"
            />
            <button onClick={handleCode} disabled={codeBusy || code.length !== 6} className="btn-primary shrink-0">
              {codeBusy ? 'Checking…' : 'Verify'}
            </button>
          </div>
        </div>
        <Link to="/" className="text-xs text-gray-400 hover:underline">
          Skip for now
        </Link>
      </div>
      <PwaInstallPrompt />
    </AuthLayout>
  );
}
