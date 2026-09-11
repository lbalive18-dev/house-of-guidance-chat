import { api } from '@/lib/axios';
import type { User } from '@/types/auth';

/**
 * Sanctum's SPA flow requires this to be called once before any state-
 * changing request (login/register/logout) in a fresh session, so the
 * server can issue the XSRF-TOKEN cookie that axios then echoes back in
 * the X-XSRF-TOKEN header on every subsequent request.
 */
export async function ensureCsrfCookie(): Promise<void> {
  await api.get('/sanctum/csrf-cookie');
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: 'student' | 'teacher';
}

export async function register(payload: RegisterPayload): Promise<User> {
  await ensureCsrfCookie();
  const { data } = await api.post<{ user: User; message: string }>('/api/register', payload);
  return data.user;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export async function login(payload: LoginPayload): Promise<User> {
  await ensureCsrfCookie();
  const { data } = await api.post<{ user: User; message: string }>('/api/login', payload);
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post('/api/logout');
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>('/api/user');
  return data;
}

export async function forgotPassword(email: string): Promise<string> {
  await ensureCsrfCookie();
  const { data } = await api.post<{ message: string }>('/api/forgot-password', { email });
  return data.message;
}

export interface ResetPasswordPayload {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<string> {
  await ensureCsrfCookie();
  const { data } = await api.post<{ message: string }>('/api/reset-password', payload);
  return data.message;
}

export async function resendVerificationEmail(): Promise<string> {
  const { data } = await api.post<{ message: string }>('/api/email/verification-notification');
  return data.message;
}

export async function verifyEmail(verifyUrl: string): Promise<string> {
  const { data } = await api.get<{ message: string }>(verifyUrl);
  return data.message;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  bio?: string;
  phone?: string;
  avatar?: File;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, value as string | Blob);
  });

  const { data } = await api.post<User>('/api/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updatePassword(
  current_password: string,
  password: string,
  password_confirmation: string
): Promise<string> {
  const { data } = await api.put<{ message: string }>('/api/profile/password', {
    current_password,
    password,
    password_confirmation,
  });
  return data.message;
}

export async function deleteAvatar(): Promise<User> {
  const { data } = await api.delete<User>('/api/profile/avatar');
  return data;
}
