import axios from 'axios';

/**
 * Shared API client for House of Guidance Chat.
 *
 * Uses Laravel Sanctum's SPA (cookie-based) authentication: requests carry
 * credentials, and callers must hit `/sanctum/csrf-cookie` once before the
 * first mutating request in a session (handled in the auth module).
 */
export const api = axios.create({
  baseURL: '/',
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
