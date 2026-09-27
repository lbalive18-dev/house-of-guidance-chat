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
          <img src="/hog-logo.png" alt="House of Guidance" className="h-12 w-12 rounded-full object-contain ring-1 ring-secondary/40" />
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
