export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  phone?: string | null;
  is_online: boolean;
  is_banned: boolean;
  last_seen_at: string | null;
  email_verified_at: string | null;
  created_at: string;
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
