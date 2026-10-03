import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import toast from 'react-hot-toast';
import { api } from '@/lib/axios';

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

const FCM_TOKEN_KEY = 'hog-fcm-token';

/**
 * One-time native shell setup: dark status bar, Android back button that
 * walks history (minimizes on the home screen), and FCM registration.
 * Web builds skip everything — zero effect outside the APK.
 */
export function initNativeShell(): void {
  if (!isNative()) return;

  void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  void StatusBar.setBackgroundColor({ color: '#041B15' }).catch(() => undefined);

  void App.addListener('backButton', ({ canGoBack }) => {
    if (window.location.pathname !== '/' && canGoBack) {
      window.history.back();
    } else {
      void App.minimizeApp();
    }
  });

  void initNativePush();
}

async function initNativePush(): Promise<void> {
  try {
    await PushNotifications.createChannel({
      id: 'hog_default',
      name: 'House of Guidance',
      description: 'Calls, messages, and reminders',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });
  } catch {
    // channels only exist on Android — safe to ignore elsewhere
  }

  let permission = await PushNotifications.checkPermissions().catch(() => null);
  if (!permission || permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions().catch(() => null);
  }
  if (!permission || permission.receive !== 'granted') return;

  await PushNotifications.register().catch(() => undefined);

  await PushNotifications.addListener('registration', async (token) => {
    try {
      window.localStorage.setItem(FCM_TOKEN_KEY, token.value);
    } catch {
      // ignore
    }
    try {
      await api.post('/api/push/fcm-token', { token: token.value, platform: 'android' });
    } catch {
      // offline now — re-registration happens on next launch/login
    }
  });

  await PushNotifications.addListener('registrationError', () => undefined);

  // Foreground push: the app is open, so show a tappable toast instead of
  // a tray notification (the tray is for when the app is closed).
  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const url = (notification.data?.url as string | undefined) ?? '/';
    const title = notification.title ?? 'House of Guidance';
    toast(
      (t) => (
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            window.location.assign(url);
          }}
          style={{ textAlign: 'left' }}
        >
          <strong style={{ display: 'block' }}>{title}</strong>
          <span style={{ fontSize: 12 }}>{notification.body}</span>
        </button>
      ),
      { duration: 6000 },
    );
  });

  // Tapped a tray notification (app was closed): deep-link to it.
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = (action.notification.data?.url as string | undefined) ?? '/';
    window.location.assign(url);
  });
}

/** Called on logout so a signed-out device stops receiving this account's pushes. */
export async function unregisterNativePush(): Promise<void> {
  if (!isNative()) return;
  try {
    const token = window.localStorage.getItem(FCM_TOKEN_KEY);
    if (token) {
      await api.delete('/api/push/subscriptions', { data: { fcm_token: token } }).catch(() => undefined);
      window.localStorage.removeItem(FCM_TOKEN_KEY);
    }
    await PushNotifications.removeAllListeners().catch(() => undefined);
  } catch {
    // logout must never fail because of push cleanup
  }
}
