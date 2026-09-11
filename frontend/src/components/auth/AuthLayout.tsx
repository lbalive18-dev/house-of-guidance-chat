import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="geometric-motif flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-secondary">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 2L2 8l10 6 10-6-10-6zM2 16l10 6 10-6M2 12l10 6 10-6" />
            </svg>
          </span>
          <span className="text-lg font-bold text-primary dark:text-primary-200">
            House of Guidance
          </span>
        </Link>

        <div className="card px-6 py-8 sm:px-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
