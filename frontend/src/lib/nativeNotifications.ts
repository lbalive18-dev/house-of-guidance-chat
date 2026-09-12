import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function initNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const permission = await LocalNotifications.requestPermissions();

  if (permission.display !== 'granted') {
    return false;
  }

  await LocalNotifications.createChannel({
    id: 'hog-messages',
    name: 'Messages',
    description: 'New House of Guidance Chat messages',
    importance: 5,
    visibility: 1,
  });

  await LocalNotifications.createChannel({
    id: 'hog-salah',
    name: 'Salah',
    description: 'Prayer reminders',
    importance: 4,
    visibility: 1,
  });

  return true;
}

export async function showMessageNotification(
  senderName: string,
  body: string,
  conversationId: number,
) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now(),
        title: senderName,
        body,
        channelId: 'hog-messages',
        extra: {
          conversationId,
        },
      },
    ],
  });
}

export async function scheduleSalahReminder(
  id: number,
  prayerName: string,
  prayerTime: Date,
) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title: `${prayerName} Prayer`,
        body: `It is time for ${prayerName}.`,
        channelId: 'hog-salah',
        schedule: {
          at: prayerTime,
          allowWhileIdle: true,
        },
      },
    ],
  });
}

export async function cancelSalahReminder(id: number) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await LocalNotifications.cancel({
    notifications: [{ id }],
  });
}