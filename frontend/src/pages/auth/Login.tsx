import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import AuthLayout from '@/components/auth/AuthLayout';
import TextField from '@/components/ui/TextField';
import { login } from '@/lib/authApi';
import { useAuthStore } from '@/store/authStore';
import type { ApiErrorResponse } from '@/types/auth';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    setSubmitting(true);
    try {
      const user = await login(values);
      setUser(user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err) && err.response?.status === 422) {
        setError('email', { message: err.response.data.errors?.email?.[0] ?? err.response.data.message });
      } else {
        toast.error('Unable to sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your journey">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary-200" {...register('remember')} />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
