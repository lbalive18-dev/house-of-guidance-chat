import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlarmClock,
  ArrowLeft,
  Bell,
  BellRing,
  BookOpenText,
  ChevronRight,
  Download,
  GraduationCap,
  MapPin,
  Moon,
  Palette,
  ScrollText,
  Settings as SettingsIcon,
  Share,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/context/ThemeContext';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import {
  disablePush,
  enablePush,
  fetchPushStatus,
  fetchReminderPreferences,
  getPushSubscription,
  isPushSupported,
  pushPermission,
  saveReminderPreferences,
  type PushStatus,
  type ReminderPreferences,
} from '@/lib/push';
import { apiErrorMessage } from '@/lib/apiError';
import Avatar from '@/components/ui/Avatar';

function useLocalPref(key: string, initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : stored === '1';
    } catch {
      return initial;
    }
  });
  const toggle = () => {
    setValue((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // private mode — preference simply won't persist
      }
      return next;
    });
  };
  return [value, toggle];
}

export function getLocalPref(key: string, initial: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? initial : stored === '1';
  } catch {
    return initial;
  }
}

function Row({
  icon: Icon,
  title,
  subtitle,
  right,
  to,
  onClick,
}: {
  icon: typeof Bell;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-gray-900 dark:text-gray-50">{title}</span>
        {subtitle && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>}
      </span>
      {right ?? (to || onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" /> : null)}
    </>
  );
  const classes =
    'flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-primary-50/60 dark:hover:bg-primary-900/20';
  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.22em] text-secondary-600 dark:text-secondary-300">
        {eyebrow}
      </p>
      <div className="card divide-y divide-gray-100 overflow-hidden !rounded-3xl px-0 dark:divide-gray-800">
        {children}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const install = usePwaInstall();
  const [privateNotifications, togglePrivateNotifications] = useLocalPref('hog-pref-private-notifications', false);
  const [installBusy, setInstallBusy] = useState(false);

  const [pushOn, setPushOn] = useState(false);
  const [pushState, setPushState] = useState<'checking' | 'on' | 'off' | 'blocked' | 'unsupported'>('checking');
  const [pushBusy, setPushBusy] = useState(false);
  const [serverStatus, setServerStatus] = useState<PushStatus | null>(null);
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState('unsupported');
      return;
    }
    if (pushPermission() === 'denied') {
      setPushState('blocked');
      return;
    }
    void getPushSubscription().then((sub) => {
      setPushOn(!!sub);
      setPushState(sub ? 'on' : 'off');
    });
    void fetchReminderPreferences().then(setPrefs);
    void fetchPushStatus().then(setServerStatus);
  }, []);

  const handlePushToggle = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        setPushState('off');
        toast.success('Push disabled on this device.');
      } else {
        const outcome = await enablePush();
        if (outcome === 'enabled') {
          setPushOn(true);
          setPushState('on');
          toast.success('Notifications enabled on this device.');
        } else if (outcome === 'denied') {
          setPushState('blocked');
          toast.error('Notifications are blocked. Allow them in your browser settings.');
        } else {
          toast.error('Could not enable notifications on this device.');
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const updatePrefs = async (patch: Partial<ReminderPreferences>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setPrefsBusy(true);
    try {
      const ok = await saveReminderPreferences(patch);
      if (!ok) toast.error(apiErrorMessage(undefined, 'Could not save reminder settings.'));
    } finally {
      setPrefsBusy(false);
    }
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location is not available on this device.');
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocBusy(false);
        void updatePrefs({ prayer_lat: pos.coords.latitude, prayer_lng: pos.coords.longitude });
        toast.success('Home location saved for prayer reminders.');
      },
      () => {
        setLocBusy(false);
        toast.error('Could not read your location. Enter it manually instead.');
      },
      { timeout: 15000 },
    );
  };

  const handleInstall = async () => {
    setInstallBusy(true);
    try {
      await install.promptInstall();
    } finally {
      setInstallBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 md:py-8">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Back" className="rounded-full p-1.5 text-gray-500 transition hover:bg-primary-50 hover:text-primary dark:hover:bg-primary-900/30">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-secondary-600 dark:text-secondary-300">
            House of Guidance
          </p>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">Settings</h1>
        </div>
      </div>

      {user && (
        <Link to="/settings/profile" className="card flex items-center gap-4 px-5 py-4 transition hover:-translate-y-0.5 hover:border-secondary/45">
          <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" showOnline isOnline={user.is_online} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-gray-900 dark:text-gray-50">{user.name}</span>
            <span className="block truncate text-xs capitalize text-gray-500 dark:text-gray-400">
              {user.role} • {user.email_verified_at ? 'Email verified' : 'Email not verified'}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
        </Link>
      )}

      <Section eyebrow="Appearance">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary dark:bg-primary-900/40 dark:text-primary-300">
            <Palette className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-gray-900 dark:text-gray-50">Theme</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Emerald day, night, or classic</span>
          </span>
          <span className="flex shrink-0 gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800" role="group" aria-label="Theme">
            {(
              [
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                title={label}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  theme === value ? 'bg-white text-primary shadow dark:bg-gray-900 dark:text-secondary-200' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </span>
        </div>
      </Section>

      <Section eyebrow="Privacy">
        <Row
          icon={Bell}
          title="Private notification content"
          subtitle="Show only the sender's name until you open the app"
          right={<Toggle on={privateNotifications} onToggle={togglePrivateNotifications} label="Private notification content" />}
        />
        <Row
          icon={ShieldCheck}
          title="Blocked by design"
          subtitle="Admins can't read private chats — reports only"
        />
      </Section>

      <Section eyebrow="Notifications">
        {pushState === 'unsupported' ? (
          <Row icon={BellRing} title="Push not supported" subtitle="This browser can't receive push notifications" />
        ) : pushState === 'blocked' ? (
          <Row icon={BellRing} title="Notifications blocked" subtitle="Allow them in your browser settings, then return here" />
        ) : (
          <>
            <Row
              icon={BellRing}
              title="Push on this device"
              subtitle={
                pushState === 'checking'
                  ? 'Checking…'
                  : pushOn
                    ? 'Calls, messages, reminders — even with the app closed'
                    : 'Ring for calls, buzz for messages and reminders'
              }
              right={<Toggle on={pushOn} onToggle={() => void handlePushToggle()} label="Push on this device" />}
            />
            {pushOn && serverStatus && (
              <Row
                icon={serverStatus.server_ready ? ShieldCheck : Bell}
                title={serverStatus.server_ready ? 'Delivery ready' : 'Delivery not ready yet'}
                subtitle={deliveryLine(serverStatus)}
              />
            )}
          </>
        )}
        {pushBusy && <p className="px-4 py-2 text-xs text-gray-400">Working…</p>}
      </Section>

      <Section eyebrow="Daily reminders">
        {!prefs ? (
          <p className="px-4 py-3 text-sm text-gray-400">Loading reminder settings…</p>
        ) : (
          <>
            <Row
              icon={AlarmClock}
              title="Daily reminders"
              subtitle={`Qur'an nudge and Hadith around ${prefs.reminder_time}`}
              right={<Toggle on={prefs.reminder_enabled} onToggle={() => void updatePrefs({ reminder_enabled: !prefs.reminder_enabled })} label="Daily reminders" />}
            />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="min-w-0 flex-1 text-sm font-bold text-gray-900 dark:text-gray-50">
                Reminder time
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">Your local time, every day</span>
              </span>
              <input
                type="time"
                value={prefs.reminder_time}
                onChange={(e) => void updatePrefs({ reminder_time: e.target.value })}
                className="input-field w-auto"
                aria-label="Daily reminder time"
              />
            </div>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="min-w-0 flex-1 text-sm font-bold text-gray-900 dark:text-gray-50">
                Time zone
              </span>
              <select
                value={prefs.reminder_timezone}
                onChange={(e) => void updatePrefs({ reminder_timezone: e.target.value })}
                className="input-field w-auto max-w-[12rem]"
                aria-label="Reminder time zone"
              >
                {timezones().map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <Row
              icon={BookOpenText}
              title="Qur'an reminder"
              subtitle="“Did you read Qur'an today?” + today's verse"
              right={<Toggle on={prefs.remind_quran} onToggle={() => void updatePrefs({ remind_quran: !prefs.remind_quran })} label="Qur'an reminder" />}
            />
            <Row
              icon={ScrollText}
              title="Hadith reminder"
              subtitle="Hadith of the day, every day"
              right={<Toggle on={prefs.remind_hadith} onToggle={() => void updatePrefs({ remind_hadith: !prefs.remind_hadith })} label="Hadith reminder" />}
            />
            <Row
              icon={BellRing}
              title="Prayer reminders"
              subtitle="Needs a home location below"
              right={<Toggle on={prefs.remind_salah} onToggle={() => void updatePrefs({ remind_salah: !prefs.remind_salah })} label="Prayer reminders" />}
            />
            <div className="space-y-2 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <p className="text-sm font-bold text-gray-900 dark:text-gray-50">Home location for prayer times</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={prefs.prayer_label ?? ''}
                  onChange={(e) => void updatePrefs({ prayer_label: e.target.value || null })}
                  placeholder="Label, e.g. Home — Lagos"
                  className="input-field min-w-0 flex-1"
                  aria-label="Location label"
                />
                <button type="button" onClick={useMyLocation} disabled={locBusy} className="btn-secondary shrink-0 px-3 py-2 text-xs">
                  {locBusy ? 'Locating…' : 'Use my location'}
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={prefs.prayer_lat ?? ''}
                  onChange={(e) => void updatePrefs({ prayer_lat: e.target.value === '' ? null : Number(e.target.value) })}
                  inputMode="decimal"
                  placeholder="Latitude"
                  className="input-field"
                  aria-label="Latitude"
                />
                <input
                  value={prefs.prayer_lng ?? ''}
                  onChange={(e) => void updatePrefs({ prayer_lng: e.target.value === '' ? null : Number(e.target.value) })}
                  inputMode="decimal"
                  placeholder="Longitude"
                  className="input-field"
                  aria-label="Longitude"
                />
              </div>
              {prefsBusy && <p className="text-xs text-gray-400">Saving…</p>}
            </div>
          </>
        )}
      </Section>

      <Section eyebrow="Learning">
        <Row icon={BookOpenText} title="Qur'an reader" subtitle="Read, translate, listen" to="/islamic/quran/read" />
        <Row icon={ScrollText} title="Hadith library" subtitle="Four verified collections" to="/islamic/hadith" />
        <Row icon={GraduationCap} title="Learning rooms" subtitle="Qur'an and Yassarna circles" to="/rooms" />
      </Section>

      <Section eyebrow="Application">
        {!install.installed && (install.canInstall || install.isIos) && (
          <Row
            icon={install.canInstall ? Download : Share}
            title={install.canInstall ? 'Install the app' : 'Add to Home Screen'}
            subtitle={install.canInstall ? 'One tap, works offline' : 'Share → Add to Home Screen'}
            onClick={install.canInstall ? () => void handleInstall() : undefined}
            right={install.canInstall ? (
              <span className="shrink-0 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-[#17352a]">
                {installBusy ? 'Opening…' : 'Install'}
              </span>
            ) : undefined}
          />
        )}
        <Row icon={User} title="Profile & account" subtitle="Name, photo, password" to="/settings/profile" />
        <Row icon={SettingsIcon} title="About this release" subtitle="House of Guidance Chat • free tier" />
      </Section>
    </div>
  );
}

function deliveryLine(status: PushStatus): string {
  const devices = `${status.devices} ${status.devices === 1 ? 'device' : 'devices'} registered`;
  if (!status.server_ready) {
    return 'The server is still being set up — reminders will appear inside the app meanwhile';
  }
  switch (status.last_attempt?.outcome) {
    case 'delivered':
      return `${devices} — last push handed over fine. Close the app and ask someone to message you`;
    case 'rejected':
      return `${devices} — the push service refused the last one. The server key likely mismatches; tell the admin`;
    case 'expired':
      return 'This device’s registration expired — switch push off and on again';
    case 'error':
      return `${devices} — last push could not reach the service. Try again in a minute`;
    default:
      return `${devices} — no push attempted yet. Close the app and ask someone to message you`;
  }
}

const COMMON_TIMEZONES = [  'UTC',
  'Africa/Lagos',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Dhaka',
  'Asia/Jakarta',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Australia/Sydney',
];

function timezones(): string[] {
  let local = '';
  try {
    local = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    local = '';
  }
  return [...new Set([local, ...COMMON_TIMEZONES].filter(Boolean))];
}
