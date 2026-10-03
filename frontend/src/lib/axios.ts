import axios from 'axios';
import { Capacitor } from '@capacitor/core';

/**
 * Shared API client for House of Guidance Chat.
 *
 * Uses Laravel Sanctum's SPA (cookie-based) authentication: requests carry
 * credentials, and callers must hit `/sanctum/csrf-cookie` once before the
 * first mutating request in a session (handled in the auth module).
 *
 * Web builds use a relative baseURL (dev proxy / Worker proxy). The native
 * APK has no proxy, so it talks to the backend directly — a relative URL
 * would hit the app's own localhost server and return HTML, crashing every
 * list on launch.
 */
function resolveBaseURL(): string {
  try {
    if (Capacitor.isNativePlatform()) {
      return (
        (import.meta.env.VITE_NATIVE_API_URL as string | undefined) ||
        'https://house-of-guidance-chat.onrender.com'
      );
    }
  } catch {
    // Capacitor bridge unavailable — fall through to the web default.
  }
  return '/';
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired or not authenticated; the auth store listens for this.
      window.dispatchEvent(new CustomEvent('hog-chat:unauthenticated'));
    }

    return Promise.reject(error);
  }
);

export default api;
