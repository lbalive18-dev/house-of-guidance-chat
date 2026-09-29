/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API GETs stay NetworkFirst with a short TTL when offline.
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'hog-chat-api-cache',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 300 })],
  }),
  'GET',
);

// SPA fallback for app routes (never for API/auth/media paths).
const navigationHandler = async (options: { request: Request; url: URL }) => {
  try {
    return await fetch(options.request);
  } catch {
    const cache = await caches.open('hog-spa-shell');
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    return Response.error();
  }
};

registerRoute(new NavigationRoute(navigationHandler as never));

interface InboxNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

self.addEventListener('push', (event) => {
  event.waitUntil(handlePush());
});

async function handlePush(): Promise<void> {
  // The app itself is open and visible: in-app dialogs, toasts, and polls
  // already cover it — stay silent instead of double-notifying.
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.some((client) => (client as WindowClient).visibilityState === 'visible')) {
    return;
  }

  let inbox: InboxNotification | null = null;
  try {
    const response = await fetch('/api/push/inbox', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = (await response.json()) as { notification: InboxNotification | null };
      inbox = data.notification;
    }
  } catch {
    inbox = null;
  }

  if (!inbox) return;

  const isCall = inbox.kind === 'IncomingCallNotification';
  const options: NotificationOptions & {
    vibrate?: number[];
    renotify?: boolean;
    actions?: { action: string; title: string }[];
  } = {
    body: inbox.body,
    icon: '/hog-logo.png',
    badge: '/hog-logo.png',
    tag: inbox.tag,
    renotify: true,
    data: { url: inbox.url },
  };

  if (isCall) {
    options.requireInteraction = true;
    options.vibrate = [250, 120, 250, 120, 400];
    options.actions = [
      { action: 'answer', title: 'Answer' },
      { action: 'open', title: 'Open' },
    ];
    options.silent = false;
  }

  await self.registration.showNotification(inbox.title, options);
}

self.addEventListener('notificationclick', (event) => {
  event.waitUntil(handleClick(event));
});

async function handleClick(event: NotificationEvent): Promise<void> {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windows) {
    const windowClient = client as WindowClient;
    try {
      const clientUrl = new URL(windowClient.url);
      if (clientUrl.pathname === url || (url !== '/' && clientUrl.pathname.startsWith(url))) {
        await windowClient.focus();
        return;
      }
    } catch {
      // unparsable client URL — fall through to opening a fresh window
    }
  }

  await self.clients.openWindow(url);
}
