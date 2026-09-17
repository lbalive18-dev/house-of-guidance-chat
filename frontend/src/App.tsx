import { useCallback, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { initNotifications } from '@/lib/nativeNotifications';
import { useAuthStore } from '@/store/authStore';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { acceptCall, declineCall } from '@/lib/callApi';
import IncomingCallDialog from '@/components/call/IncomingCallDialog';
import { router } from '@/router';

export default function App() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { ringing, dismissRinging } = useIncomingCalls(currentUserId);

  useEffect(() => {
    initNotifications().catch((error) => {
      console.error('Unable to initialize notifications:', error);
    });
  }, []);

  const handleAcceptRinging = useCallback(async () => {
    if (!ringing) return;
    const session = ringing;
    dismissRinging();
    try {
      await acceptCall(session.id);
    } catch {
      // Chat page will surface the failure and offer rejoin.
    }
    void router.navigate(`/chat/${session.conversation_id}`);
  }, [ringing, dismissRinging]);

  const handleDeclineRinging = useCallback(async () => {
    if (!ringing) return;
    const sessionId = ringing.id;
    dismissRinging();
    try {
      await declineCall(sessionId);
    } catch {
      // already resolved server-side
    }
  }, [ringing, dismissRinging]);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />

      {ringing && (
        <IncomingCallDialog
          session={ringing}
          onAccept={() => void handleAcceptRinging()}
          onDecline={() => void handleDeclineRinging()}
        />
      )}

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '0.875rem',
            background: '#0B6E4F',
            color: '#FFFFFF',
          },
          success: {
            iconTheme: {
              primary: '#D4AF37',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}