import { create } from 'zustand';
import type { User } from '@/types/auth';
import { fetchCurrentUser, logout as apiLogout } from '@/lib/authApi';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setUser: (user: User | null) => void;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),

  loadUser: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      const user = await fetchCurrentUser();
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  logout: async () => {
    try {
      await apiLogout();
    } finally {
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));

// Any 401 response from the API (session expired, logged out elsewhere)
// immediately reflects in the store so the UI can redirect to /login.
window.addEventListener('hog-chat:unauthenticated', () => {
  useAuthStore.getState().setUser(null);
});
