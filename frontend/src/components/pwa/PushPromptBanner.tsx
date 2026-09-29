import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';
import { enablePush, isPushSupported, pushPermission } from '@/lib/push';

const ASKED_KEY = 'hog-push-asked';

/**
 * One-time gentle nudge: if push is supported and the browser hasn't been
 * asked yet, offer to enable — dismiss forever on any choice. Never nags.
 */
export default function PushPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ASKED_KEY)) return;
    } catch {
      return;
    }
    if (isPushSupported() && pushPermission() === 'default') {
      setVisible(true);
    }
  }, []);

  const settle = (enabled: boolean) => {
    try {
      window.localStorage.setItem(ASKED_KEY, enabled ? 'granted' : 'dismissed');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      const outcome = await enablePush();
      settle(outcome === 'enabled');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-secondary/30 bg-gradient-to-r from-[#063b2d] to-[#0a4a38] px-4 py-3 text-white shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-200">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Never miss a call or reminder</p>
        <p className="truncate text-xs text-emerald-50/70">
          Enable notifications — works even with the app closed.{' '}
          <Link to="/settings" className="font-semibold underline">Details</Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleEnable()}
        disabled={busy}
        className="shrink-0 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-[#17352a] hover:bg-secondary-200 disabled:opacity-60"
      >
        {busy ? 'Enabling…' : 'Enable'}
      </button>
      <button
        type="button"
        onClick={() => settle(false)}
        aria-label="Dismiss notifications prompt"
        className="shrink-0 rounded-full p-1.5 text-emerald-50/60 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
