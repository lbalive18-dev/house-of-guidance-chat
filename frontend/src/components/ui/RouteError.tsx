import { Link, useLocation, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

/**
 * Recovery screen for render crashes (replaces the dead-end default).
 * Shows where it happened plus reload/home actions; technical details
 * stay behind one tap so users can report them.
 */
export default function RouteError() {
  const error = useRouteError();
  const location = useLocation();

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Something went wrong on this screen.';

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
        This screen stumbled
      </h1>
      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        Sorry about that — your chats and data are safe. Try reloading, or head back home.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          <RotateCcw className="h-4 w-4" /> Reload
        </button>
        <Link to="/" className="btn-secondary">
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>
      <details className="mt-6 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-left dark:border-gray-800 dark:bg-gray-900">
        <summary className="cursor-pointer text-xs font-semibold text-gray-500 dark:text-gray-400">
          Technical details (for reporting)
        </summary>
        <p className="mt-2 break-all font-mono text-[11px] leading-5 text-gray-500 dark:text-gray-400">
          Screen: {location.pathname}
          <br />
          Error: {message}
        </p>
      </details>
    </div>
  );
}
