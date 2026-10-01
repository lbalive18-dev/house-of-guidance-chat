import { api } from '@/lib/axios';

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob(padded);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export interface ReminderPreferences {
  reminder_enabled: boolean;
  reminder_time: string;
  reminder_timezone: string;
  remind_quran: boolean;
  remind_hadith: boolean;
  remind_salah: boolean;
  prayer_lat: number | null;
  prayer_lng: number | null;
  prayer_label: string | null;
}

/**
 * Enable push on this device: permission → browser subscription →
 * server record. Returns a human-readable outcome for toasts.
 */
export async function enablePush(): Promise<'enabled' | 'denied' | 'unsupported' | 'failed'> {
  if (!isPushSupported()) return 'unsupported';

  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return 'denied';
  }

  try {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidKey) return 'failed';
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      }));
    const json = subscription.toJSON();
    await api.post('/api/push/subscriptions', {
      endpoint: subscription.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      user_agent: navigator.userAgent.slice(0, 255),
    });
    return 'enabled';
  } catch {
    return 'failed';
  }
}

export async function disablePush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api.delete('/api/push/subscriptions', { data: { endpoint: subscription.endpoint } }).catch(() => undefined);
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

export interface PushStatus {
  server_ready: boolean;
  devices: number;
  last_attempt: { outcome: string; at: string } | null;
}

export async function fetchPushStatus(): Promise<PushStatus | null> {
  try {
    const { data } = await api.get<PushStatus>('/api/push/status');
    return data;
  } catch {
    return null;
  }
}

export async function fetchReminderPreferences(): Promise<ReminderPreferences | null> {
  try {
    const { data } = await api.get<{ preferences: ReminderPreferences }>('/api/push/preferences');
    return data.preferences;
  } catch {
    return null;
  }
}

export async function saveReminderPreferences(prefs: Partial<ReminderPreferences>): Promise<boolean> {
  try {
    await api.put('/api/push/preferences', prefs);
    return true;
  } catch {
    return false;
  }
}
