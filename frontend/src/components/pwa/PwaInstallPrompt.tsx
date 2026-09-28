import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

/**
 * Optional install nudge shown after registration. Never blocks the app:
 * the browser decides whether a native prompt exists, otherwise we show
 * manual Add to Home Screen steps.
 */
export default function PwaInstallPrompt({ compact = false }: { compact?: boolean }) {
  const { canInstall, installed, isIos, dismissed, dismiss, promptInstall } = usePwaInstall();
  const [busy, setBusy] = useState(false);

  if (installed || dismissed) return null;

  const handleInstall = async () => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  };

  // Native prompt available (Chrome/Edge/Android)
  if (canInstall) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-secondary/30 bg-gradient-to-r from-[#063b2d] to-[#0a4a38] px-4 py-3 text-white shadow-sm ${compact ? '' : 'mt-4'}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-200">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Install House of Guidance Chat</p>
          <p className="truncate text-xs text-emerald-50/70">Add it to your home screen for quick access.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={busy}
          className="shrink-0 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-[#17352a] hover:bg-secondary-200 disabled:opacity-60"
        >
          {busy ? 'Opening…' : 'Install'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-full p-1.5 text-emerald-50/60 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // iOS / browsers without a prompt event: manual guidance only.
  if (isIos) {
    return (
      <div className={`rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs leading-5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100 ${compact ? '' : 'mt-4'}`}>
        <p className="flex items-center gap-1.5 font-bold">
          <Share className="h-4 w-4" /> Add to Home Screen
        </p>
        <p className="mt-1 text-emerald-900/75 dark:text-emerald-100/75">
          Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> to install House of Guidance Chat.
          You can keep using the app here either way.
        </p>
      </div>
    );
  }

  return null;
}
