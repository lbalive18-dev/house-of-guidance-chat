import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthLayout from '@/components/auth/AuthLayout';
import TextField from '@/components/ui/TextField';
import { forgotPassword } from '@/lib/authApi';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (values: ForgotPasswordForm) => {
    setSubmitting(true);
    try {
      await forgotPassword(values.email);
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          If an account exists for that email address, we&apos;ve sent a link to reset
          your password. It expires in 60 minutes.
        </p>
        <Link to="/login" className="btn-secondary mt-6 w-full">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Remembered it after all?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
