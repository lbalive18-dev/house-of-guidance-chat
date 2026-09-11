import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import AuthLayout from '@/components/auth/AuthLayout';
import TextField from '@/components/ui/TextField';
import { resetPassword } from '@/lib/authApi';
import type { ApiErrorResponse } from '@/types/auth';

interface ResetPasswordForm {
  password: string;
  password_confirmation: string;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const onSubmit = async (values: ResetPasswordForm) => {
    if (!token || !email) {
      toast.error('This password reset link is invalid or has expired.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, email, ...values });
      toast.success('Password reset. Please sign in.');
      navigate('/login');
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err)) {
        toast.error(err.response?.data.message ?? 'Could not reset password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return (
      <AuthLayout title="Invalid reset link">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This password reset link is missing or invalid. Please request a new one.
        </p>
        <Link to="/forgot-password" className="btn-primary mt-6 w-full">
          Request new link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle={`Resetting password for ${email}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
          })}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation', { required: 'Please confirm your password' })}
        />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}
