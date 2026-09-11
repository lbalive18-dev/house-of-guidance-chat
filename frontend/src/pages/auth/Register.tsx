import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import TextField from '@/components/ui/TextField';
import { register as registerUser } from '@/lib/authApi';
import { useAuthStore } from '@/store/authStore';
import type { ApiErrorResponse } from '@/types/auth';
import { isAxiosError } from 'axios';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'student' | 'teacher';
}

export default function Register() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterForm>({ defaultValues: { role: 'student' } });

  const onSubmit = async (values: RegisterForm) => {
    setSubmitting(true);
    try {
      const user = await registerUser(values);
      setUser(user);
      toast.success('Welcome to House of Guidance Chat!');
      navigate('/verify-email');
    } catch (err) {
      if (isAxiosError<ApiErrorResponse>(err) && err.response?.data.errors) {
        Object.entries(err.response.data.errors).forEach(([field, messages]) => {
          setError(field as keyof RegisterForm, { message: messages[0] });
        });
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join the House of Guidance community">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', { required: 'Your name is required' })}
        />
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', { required: 'Email is required' })}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
            I am joining as
          </label>
          <select className="input-field" {...register('role')}>
            <option value="student">A student</option>
            <option value="teacher">A teacher</option>
          </select>
        </div>
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation', { required: 'Please confirm your password' })}
        />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
